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
    const { profile_id } = await req.json()

    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'profile_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Cancelling pending profile:', profile_id, 'for user:', userId)

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the profile and verify it belongs to this user and is pending
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, status, user_id')
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

    // Only allow cancelling pending profiles
    if (profile.status !== 'pending') {
      console.log('Profile is not pending:', profile.status)
      return new Response(JSON.stringify({ error: 'Apenas perfis pendentes podem ser cancelados' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete the pending profile
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profile_id)

    if (deleteError) {
      console.error('Failed to delete pending profile:', deleteError.message)
      return new Response(JSON.stringify({ error: 'Falha ao cancelar perfil' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Clear user's app_metadata couple_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { couple_id: null },
    })

    if (updateError) {
      console.error('Failed to clear user metadata:', updateError.message)
      // Continue anyway - profile was deleted
    }

    console.log('Pending profile cancelled successfully:', profile_id)

    return new Response(
      JSON.stringify({ success: true }),
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
