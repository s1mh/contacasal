import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { isValidUUID } from '../_shared/sanitize.ts'

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

    // Verify JWT and get user
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

    const coupleId = claims.claims.app_metadata?.couple_id
    const userId = claims.claims.sub
    if (!coupleId) {
      return new Response(JSON.stringify({ error: 'No space associated' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, target_profile_id } = await req.json()

    if (!action || !target_profile_id || !isValidUUID(target_profile_id)) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // SECURITY: Derive caller's profile from JWT user_id, not from client input
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('couple_id', coupleId)
      .eq('user_id', userId)
      .single()

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is an admin using server-derived profile_id
    const { data: callerRole } = await supabaseAdmin
      .from('space_roles')
      .select('role')
      .eq('space_id', coupleId)
      .eq('profile_id', callerProfile.id)
      .single()

    if (!callerRole || callerRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem gerenciar membros' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify target profile belongs to the same space
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, couple_id, name')
      .eq('id', target_profile_id)
      .single()

    if (!targetProfile || targetProfile.couple_id !== coupleId) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado neste espaço' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    switch (action) {
      case 'promote': {
        const { error: updateError } = await supabaseAdmin
          .from('space_roles')
          .update({ role: 'admin' })
          .eq('space_id', coupleId)
          .eq('profile_id', target_profile_id)

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Falha ao promover membro' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Membro promovido a administrador' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      case 'demote': {
        const { count: adminCount } = await supabaseAdmin
          .from('space_roles')
          .select('*', { count: 'exact', head: true })
          .eq('space_id', coupleId)
          .eq('role', 'admin')

        if ((adminCount || 0) <= 1) {
          return new Response(JSON.stringify({ error: 'O espaço precisa ter pelo menos um administrador' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { error: updateError } = await supabaseAdmin
          .from('space_roles')
          .update({ role: 'member' })
          .eq('space_id', coupleId)
          .eq('profile_id', target_profile_id)

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Falha ao rebaixar administrador' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Administrador rebaixado a membro' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      case 'remove': {
        // Cannot remove yourself
        if (target_profile_id === callerProfile.id) {
          return new Response(JSON.stringify({ error: 'Você não pode remover a si mesmo' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        await supabaseAdmin
          .from('space_roles')
          .delete()
          .eq('space_id', coupleId)
          .eq('profile_id', target_profile_id)

        const { error: resetError } = await supabaseAdmin
          .from('profiles')
          .update({
            name: 'Pessoa',
            avatar_index: 1,
            color: '#94A3B8',
            pin_code: null,
            email: null,
            username: null,
          })
          .eq('id', target_profile_id)

        if (resetError) {
          return new Response(JSON.stringify({ error: 'Falha ao remover membro' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Membro removido do espaço' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
