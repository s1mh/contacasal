import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { share_code } = await req.json();

    if (!share_code || typeof share_code !== 'string' || !/^[a-f0-9]{16}$/i.test(share_code.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: space, error: spaceError } = await supabaseAdmin
      .from('couples')
      .select('id, share_code, max_members')
      .eq('share_code', share_code.trim().toLowerCase())
      .single();

    if (spaceError || !space) {
      // Generic error - don't confirm or deny existence
      return new Response(
        JSON.stringify({ success: false, error: 'Código inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { count: activeCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', space.id)
      .or('status.eq.active,status.is.null');

    if (countError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao verificar espaço' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxMembers = space.max_members || 5;
    const currentMembers = activeCount || 0;
    const hasVacancy = currentMembers < maxMembers;

    const { data: hostProfile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('couple_id', space.id)
      .or('status.eq.active,status.is.null')
      .neq('name', 'Pessoa 1')
      .neq('name', 'Pessoa 2')
      .neq('name', 'Pessoa')
      .limit(1)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        couple_id: space.id,
        has_vacancy: hasVacancy,
        current_members: currentMembers,
        max_members: maxMembers,
        host_name: hostProfile?.name || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-share-code-public:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
