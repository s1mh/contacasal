import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, couple_id } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email exists in any profile (case insensitive)
    const { data: existingProfile, error: queryError } = await supabase
      .from('profiles')
      .select('id, name, couple_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (queryError) {
      console.error('[check-email] Query error:', queryError);
      throw queryError;
    }

    if (!existingProfile) {
      return new Response(
        JSON.stringify({ 
          success: true,
          exists: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email exists - check if it's in the same couple space
    const isSameCouple = couple_id && existingProfile.couple_id === couple_id;

    // Get share_code for the existing profile's couple (masked)
    const { data: coupleData } = await supabase
      .from('couples')
      .select('share_code')
      .eq('id', existingProfile.couple_id)
      .single();

    const maskedCode = coupleData?.share_code 
      ? `****${coupleData.share_code.slice(-4)}`
      : null;

    console.log(`[check-email] Email ${normalizedEmail} exists in profile ${existingProfile.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        exists: true,
        same_couple: isSameCouple,
        can_recover: true,
        masked_space: maskedCode,
        profile_name: existingProfile.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[check-email] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao verificar e-mail' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
