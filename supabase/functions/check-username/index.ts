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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { username, exclude_profile_id } = await req.json()

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '')

    if (cleanUsername.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Username deve ter pelo menos 3 caracteres', exists: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if username already exists
    let query = supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)

    if (exclude_profile_id) {
      query = query.neq('id', exclude_profile_id)
    }

    const { data: existingProfiles, error } = await query.limit(1)

    if (error) {
      console.error('Error checking username:', error)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar username' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const exists = existingProfiles && existingProfiles.length > 0

    return new Response(
      JSON.stringify({ 
        success: true,
        exists,
        username: cleanUsername 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
