import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify JWT
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token)

    if (claimsError || !claims?.claims) {
      console.log('Invalid JWT:', claimsError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claims.claims.sub
    console.log('Creating space for user:', userId)

    // Create space using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: couple, error: coupleError } = await supabaseAdmin
      .from('couples')
      .insert({ max_members: 5 })
      .select('id, share_code')
      .single()

    if (coupleError || !couple) {
      console.error('Failed to create space:', coupleError?.message)
      return new Response(JSON.stringify({ error: 'Failed to create space' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Space created:', couple.id, 'share_code:', couple.share_code)

    // Verify user exists before trying to bind
    const { data: userExists } = await supabaseAdmin.auth.admin.getUserById(userId)

    // Get the first profile (created by trigger) and assign admin role + user_id
    const { data: firstProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('couple_id', couple.id)
      .order('position')
      .limit(1)
      .single()

    if (firstProfile) {
      // Only update profile with user_id if user exists
      if (userExists?.user) {
        const { error: updateProfileError } = await supabaseAdmin
          .from('profiles')
          .update({ user_id: userId })
          .eq('id', firstProfile.id)

        if (updateProfileError) {
          console.error('Failed to set user_id on profile:', updateProfileError.message)
        } else {
          console.log('Set user_id on profile:', firstProfile.id)
        }
      } else {
        console.log('User not found, skipping user_id assignment for profile:', firstProfile.id)
      }

      // Assign admin role to the first profile
      const { error: roleError } = await supabaseAdmin
        .from('space_roles')
        .insert({
          space_id: couple.id,
          profile_id: firstProfile.id,
          role: 'admin',
        })

      if (roleError) {
        console.error('Failed to assign admin role:', roleError.message)
        // Continue anyway - space was created
      } else {
        console.log('Admin role assigned to first profile:', firstProfile.id)
      }
    }

    // Bind current user to space in JWT claims via app_metadata (only if user exists)
    if (userExists?.user) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { couple_id: couple.id },
      })

      if (updateError) {
        console.error('Failed to update user metadata:', updateError.message)
        // Don't fail the whole operation - space was created successfully
      } else {
        console.log('User metadata updated with couple_id')
      }
    } else {
      console.log('User not found, skipping app_metadata update')
    }

    return new Response(
      JSON.stringify({ success: true, couple_id: couple.id, share_code: couple.share_code }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
