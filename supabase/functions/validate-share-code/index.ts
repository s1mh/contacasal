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
      console.log('Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Create client with user's auth token to verify they're authenticated
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      console.log('Invalid JWT:', claimsError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub
    console.log('User authenticated:', userId)

    // Parse request body
    const { share_code } = await req.json()
    
    if (!share_code || typeof share_code !== 'string') {
      console.log('Invalid share_code provided')
      return new Response(
        JSON.stringify({ error: 'Share code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate share code format (16 hex characters)
    const shareCodeRegex = /^[a-f0-9]{16}$/i
    if (!shareCodeRegex.test(share_code)) {
      console.log('Invalid share_code format:', share_code)
      return new Response(
        JSON.stringify({ error: 'Invalid share code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client to look up couple and update user metadata
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Look up the couple by share code
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from('couples')
      .select('id')
      .eq('share_code', share_code)
      .single()

    if (coupleError || !couple) {
      console.log('Couple not found for share_code:', share_code)
      return new Response(
        JSON.stringify({ error: 'Couple not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found couple:', couple.id, 'for share_code')

    // Update the user's app_metadata with the couple_id
    // This will be included in future JWT tokens
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: { couple_id: couple.id }
      }
    )

    if (updateError) {
      console.error('Failed to update user metadata:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to validate share code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully set couple_id in user metadata')

    return new Response(
      JSON.stringify({ 
        success: true, 
        couple_id: couple.id,
        message: 'Share code validated. Please refresh your session to access data.'
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
