import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { isValidEmail } from '../_shared/sanitize.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, couple_id } = await req.json();

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingProfile, error: queryError } = await supabase
      .from('profiles')
      .select('id, couple_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (queryError) {
      throw queryError;
    }

    if (!existingProfile) {
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reduced info leakage - only say if it exists and if it's same couple
    const isSameCouple = couple_id && existingProfile.couple_id === couple_id;

    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        same_couple: isSameCouple,
        can_recover: true,
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
