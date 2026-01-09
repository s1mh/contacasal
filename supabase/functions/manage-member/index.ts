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

    const coupleId = claims.claims.app_metadata?.couple_id
    if (!coupleId) {
      return new Response(JSON.stringify({ error: 'No space associated with this user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, target_profile_id, caller_profile_id } = await req.json()

    if (!action || !target_profile_id || !caller_profile_id) {
      return new Response(JSON.stringify({ error: 'action, target_profile_id, and caller_profile_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Manage member action:', action, 'target:', target_profile_id, 'caller:', caller_profile_id)

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify caller is an admin
    const { data: callerRole } = await supabaseAdmin
      .from('space_roles')
      .select('role')
      .eq('space_id', coupleId)
      .eq('profile_id', caller_profile_id)
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
        // Promote member to admin
        const { error: updateError } = await supabaseAdmin
          .from('space_roles')
          .update({ role: 'admin' })
          .eq('space_id', coupleId)
          .eq('profile_id', target_profile_id)

        if (updateError) {
          console.error('Failed to promote member:', updateError.message)
          return new Response(JSON.stringify({ error: 'Falha ao promover membro' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Member promoted to admin:', target_profile_id)
        return new Response(
          JSON.stringify({ success: true, message: 'Membro promovido a administrador' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      case 'demote': {
        // Verify there will be at least one admin left
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
          console.error('Failed to demote admin:', updateError.message)
          return new Response(JSON.stringify({ error: 'Falha ao rebaixar administrador' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Admin demoted to member:', target_profile_id)
        return new Response(
          JSON.stringify({ success: true, message: 'Administrador rebaixado a membro' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      case 'remove': {
        // Cannot remove yourself
        if (target_profile_id === caller_profile_id) {
          return new Response(JSON.stringify({ error: 'Você não pode remover a si mesmo' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Delete the role first
        await supabaseAdmin
          .from('space_roles')
          .delete()
          .eq('space_id', coupleId)
          .eq('profile_id', target_profile_id)

        // Reset the profile to default state (soft delete)
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
          console.error('Failed to reset profile:', resetError.message)
          return new Response(JSON.stringify({ error: 'Falha ao remover membro' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('Member removed:', target_profile_id)
        return new Response(
          JSON.stringify({ success: true, message: 'Membro removido do espaço' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action. Use: promote, demote, or remove' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
