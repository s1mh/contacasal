import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'
import { sanitizeName } from '../_shared/sanitize.ts'
import { hashPin, isValidPin } from '../_shared/pin.ts'

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Rate limit: 5 space creations per 10 minutes
    const { allowed } = await checkRateLimit(supabaseAdmin, req, 'create-couple', 5, 10)
    if (!allowed) return rateLimitResponse(corsHeaders)

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

    // Parse optional profile data from request body
    const body = await req.json().catch(() => ({}))
    const { name, avatar_index, color, pin, email, username } = body

    const { data: couple, error: coupleError } = await supabaseAdmin
      .from('couples')
      .insert({ max_members: 5 })
      .select('id, share_code')
      .single()

    if (coupleError || !couple) {
      return new Response(JSON.stringify({ error: 'Falha ao criar espaço' }), {
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
      // Build profile update with provided data
      const profileUpdate: Record<string, unknown> = {}
      if (userExists?.user) profileUpdate.user_id = userId
      if (name && typeof name === 'string') profileUpdate.name = sanitizeName(name, 50)
      if (avatar_index && typeof avatar_index === 'number' && avatar_index >= 1 && avatar_index <= 8) {
        profileUpdate.avatar_index = avatar_index
      }
      if (color && typeof color === 'string') profileUpdate.color = color.substring(0, 7)
      if (pin && isValidPin(pin)) profileUpdate.pin_code = await hashPin(pin)
      if (email && typeof email === 'string') profileUpdate.email = email.trim().toLowerCase().substring(0, 100)
      if (username && typeof username === 'string') profileUpdate.username = username.trim().toLowerCase().substring(0, 20)

      if (Object.keys(profileUpdate).length > 0) {
        await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
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
    console.error('[create-couple] Error')
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
