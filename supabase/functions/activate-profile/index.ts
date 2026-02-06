import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { hashPin, isValidPin } from '../_shared/pin.ts'
import { sanitizeName, isValidEmail, isValidUsername, isValidUUID } from '../_shared/sanitize.ts'

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
    const { profile_id, name, avatar_index, color, pin_code, email, username } = await req.json()

    if (!profile_id || !isValidUUID(profile_id)) {
      return new Response(JSON.stringify({ error: 'profile_id inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, status, pending_expires_at, couple_id, user_id')
      .eq('id', profile_id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (profile.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Perfil não pertence a este usuário' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (profile.status === 'pending' && profile.pending_expires_at) {
      if (new Date(profile.pending_expires_at) < new Date()) {
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

    const updateData: Record<string, unknown> = {
      status: 'active',
      pending_expires_at: null,
    }

    if (name) updateData.name = sanitizeName(name)
    if (avatar_index) updateData.avatar_index = avatar_index
    if (color) updateData.color = color
    if (pin_code && isValidPin(pin_code)) updateData.pin_code = await hashPin(pin_code)
    if (email && isValidEmail(email)) updateData.email = email.trim().toLowerCase()
    if (username && isValidUsername(username.replace(/^@/, '').toLowerCase().trim())) {
      updateData.username = username.replace(/^@/, '').toLowerCase().trim()
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', profile_id)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Falha ao ativar perfil' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: roleError } = await supabaseAdmin
      .from('space_roles')
      .insert({
        space_id: profile.couple_id,
        profile_id: profile_id,
        role: 'member',
      })

    if (roleError) {
      console.error('Failed to assign role:', roleError.message)
    }

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
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
