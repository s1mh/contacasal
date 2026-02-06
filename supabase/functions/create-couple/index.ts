import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req)
  if (corsResponse) return corsResponse

  const corsHeaders = getCorsHeaders(req)

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

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token)

    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claims.claims.sub

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: couple, error: coupleError } = await supabaseAdmin
      .from('couples')
      .insert({ max_members: 5 })
      .select('id, share_code')
      .single()

    if (coupleError || !couple) {
      return new Response(JSON.stringify({ error: 'Failed to create space' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userExists } = await supabaseAdmin.auth.admin.getUserById(userId)

    const { data: firstProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('couple_id', couple.id)
      .order('position')
      .limit(1)
      .single()

    if (firstProfile) {
      if (userExists?.user) {
        await supabaseAdmin
          .from('profiles')
          .update({ user_id: userId })
          .eq('id', firstProfile.id)
      }

      await supabaseAdmin
        .from('space_roles')
        .insert({
          space_id: couple.id,
          profile_id: firstProfile.id,
          role: 'admin',
        })
    }

    if (userExists?.user) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { couple_id: couple.id },
      })
    }

    return new Response(
      JSON.stringify({ success: true, couple_id: couple.id, share_code: couple.share_code }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
