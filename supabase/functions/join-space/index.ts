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
    const { share_code } = await req.json()

    if (!share_code || typeof share_code !== 'string') {
      return new Response(JSON.stringify({ error: 'share_code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate share_code format
    if (!/^[a-f0-9]{16}$/i.test(share_code)) {
      return new Response(JSON.stringify({ error: 'Código inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Find the space by share_code
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('couples')
      .select('id, max_members')
      .eq('share_code', share_code)
      .single()

    if (spaceError || !space) {
      return new Response(JSON.stringify({ error: 'Espaço não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user already has a pending profile in this space
    const { data: existingPending } = await supabaseAdmin
      .from('profiles')
      .select('id, pending_expires_at, status')
      .eq('couple_id', space.id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    if (existingPending) {
      // Check if expired
      if (existingPending.pending_expires_at && new Date(existingPending.pending_expires_at) < new Date()) {
        // Expired - delete and proceed as new
        await supabaseAdmin.from('profiles').delete().eq('id', existingPending.id)
      } else {
        // Still valid - renew expiration and return as returning user
        const newExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('profiles')
          .update({ pending_expires_at: newExpiration })
          .eq('id', existingPending.id)
        
        // Renewed pending profile expiration
        
        // Update user's app_metadata with couple_id
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: { couple_id: space.id },
        })
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            couple_id: space.id, 
            profile_id: existingPending.id,
            is_returning: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    // Count current ACTIVE members (not pending)
    const { count: activeCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', space.id)
      .or('status.eq.active,status.is.null')

    const maxMembers = space.max_members || 5
    if ((activeCount || 0) >= maxMembers) {
      return new Response(JSON.stringify({ error: 'Espaço cheio (máximo 5 pessoas)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get next available position
    const { data: existingPositions } = await supabaseAdmin
      .from('profiles')
      .select('position')
      .eq('couple_id', space.id)

    const usedPositions = new Set((existingPositions || []).map(p => p.position))
    let nextPosition = 1
    for (let i = 1; i <= 5; i++) {
      if (!usedPositions.has(i)) {
        nextPosition = i
        break
      }
    }

    // Default colors for new members
    const defaultColors = ['#F5A9B8', '#A8D5BA', '#B5A8D5', '#D5A8C8', '#A8C5D5']

    // Create new PENDING profile (30 min expiration)
    const pendingExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        couple_id: space.id,
        user_id: userId,
        name: 'Pessoa',
        color: defaultColors[nextPosition - 1] || '#94A3B8',
        avatar_index: nextPosition,
        position: nextPosition,
        status: 'pending',
        pending_expires_at: pendingExpiresAt,
      })
      .select('id')
      .single()

    if (profileError || !newProfile) {
      console.error('[join-space] Profile creation failed')
      return new Response(JSON.stringify({ error: 'Falha ao criar perfil' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // NOTE: We do NOT create space_roles here - only when profile is activated!

    // Update user's app_metadata with couple_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { couple_id: space.id },
    })

    if (updateError) {
      console.error('[join-space] Metadata update failed')
      return new Response(JSON.stringify({ error: 'Falha ao vincular usuário ao espaço' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        couple_id: space.id, 
        profile_id: newProfile.id,
        position: nextPosition,
        is_returning: false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('[join-space] Error')
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
