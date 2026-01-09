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
    const { 
      profile_id, 
      name, 
      avatar_index, 
      color, 
      pin_code, 
      email, 
      username 
    } = await req.json()

    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'profile_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Activating profile:', profile_id, 'for user:', userId)

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the profile and verify it belongs to this user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, status, pending_expires_at, couple_id, user_id')
      .eq('id', profile_id)
      .single()

    if (profileError || !profile) {
      console.log('Profile not found:', profileError?.message)
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the profile belongs to the user
    if (profile.user_id !== userId) {
      console.log('Profile does not belong to user:', profile.user_id, '!=', userId)
      return new Response(JSON.stringify({ error: 'Perfil não pertence a este usuário' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if profile is pending and expired
    if (profile.status === 'pending' && profile.pending_expires_at) {
      if (new Date(profile.pending_expires_at) < new Date()) {
        // Expired - delete and return error
        console.log('Pending profile expired, deleting:', profile_id)
        await supabaseAdmin.from('profiles').delete().eq('id', profile_id)
        
        return new Response(JSON.stringify({ 
          error: 'Reserva expirou. Por favor, entre novamente pelo link de convite.',
          expired: true
        }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      status: 'active',
      pending_expires_at: null,
    }

    if (name) updateData.name = name
    if (avatar_index) updateData.avatar_index = avatar_index
    if (color) updateData.color = color
    if (pin_code) updateData.pin_code = pin_code
    if (email) updateData.email = email
    if (username) updateData.username = username

    // Activate the profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', profile_id)

    if (updateError) {
      console.error('Failed to activate profile:', updateError.message)
      return new Response(JSON.stringify({ error: 'Falha ao ativar perfil' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create 'member' role for this profile
    const { error: roleError } = await supabaseAdmin
      .from('space_roles')
      .insert({
        space_id: profile.couple_id,
        profile_id: profile_id,
        role: 'member',
      })

    if (roleError) {
      console.error('Failed to assign role:', roleError.message)
      // Continue anyway - profile was activated
    }

    console.log('Profile activated successfully:', profile_id)

    return new Response(
      JSON.stringify({ 
        success: true,
        profile_id: profile_id,
        couple_id: profile.couple_id,
      }),
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
