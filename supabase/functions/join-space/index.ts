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
    const { share_code } = await req.json()

    if (!share_code) {
      return new Response(JSON.stringify({ error: 'share_code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('User attempting to join space:', userId, 'with code:', share_code)

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Find the space by share_code
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('couples')
      .select('id, max_members')
      .eq('share_code', share_code)
      .single()

    if (spaceError || !space) {
      console.log('Space not found:', spaceError?.message)
      return new Response(JSON.stringify({ error: 'Espaço não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Count current members
    const { count: memberCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', space.id)

    const maxMembers = space.max_members || 5
    if ((memberCount || 0) >= maxMembers) {
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

    // Create new profile for this member with user_id
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        couple_id: space.id,
        user_id: userId,
        name: `Pessoa ${nextPosition}`,
        color: defaultColors[nextPosition - 1] || '#94A3B8',
        avatar_index: nextPosition,
        position: nextPosition,
      })
      .select('id')
      .single()

    if (profileError || !newProfile) {
      console.error('Failed to create profile:', profileError?.message)
      return new Response(JSON.stringify({ error: 'Falha ao criar perfil' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Assign 'member' role to this profile
    const { error: roleError } = await supabaseAdmin
      .from('space_roles')
      .insert({
        space_id: space.id,
        profile_id: newProfile.id,
        role: 'member',
      })

    if (roleError) {
      console.error('Failed to assign role:', roleError.message)
      // Continue anyway - profile was created
    }

    // Update user's app_metadata with couple_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { couple_id: space.id },
    })

    if (updateError) {
      console.error('Failed to update user metadata:', updateError.message)
      return new Response(JSON.stringify({ error: 'Falha ao vincular usuário ao espaço' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('User joined space successfully:', userId, 'as position', nextPosition)

    return new Response(
      JSON.stringify({ 
        success: true, 
        couple_id: space.id, 
        profile_id: newProfile.id,
        position: nextPosition,
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
