import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { share_code } = await req.json();

    if (!share_code || typeof share_code !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Código de compartilhamento inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the couple by share code
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('couples')
      .select('id, share_code, max_members')
      .eq('share_code', share_code.trim().toLowerCase())
      .single();

    if (spaceError || !space) {
      console.log('Space not found for share code:', share_code);
      return new Response(
        JSON.stringify({ success: false, error: 'Código não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count active members (excluding pending profiles)
    const { count: activeCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', space.id)
      .or('status.eq.active,status.is.null');

    if (countError) {
      console.error('Error counting members:', countError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao verificar espaço' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxMembers = space.max_members || 5;
    const currentMembers = activeCount || 0;
    const hasVacancy = currentMembers < maxMembers;

    // Get host profile name for welcome message
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

    console.log('Space validated:', {
      coupleId: space.id,
      currentMembers,
      maxMembers,
      hasVacancy,
      hostName: hostProfile?.name
    });

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
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
