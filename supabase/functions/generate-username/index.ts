import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

function normalizeForUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 12);
}

function generateSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const baseName = normalizeForUsername(name);
    if (baseName.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome muito curto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let username = '';
    let attempts = 0;
    while (attempts < 10) {
      username = `${baseName}_${generateSuffix()}`;
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    }

    if (attempts >= 10) {
      username = `${baseName}_${Date.now().toString(36).slice(-5)}`;
    }

    return new Response(
      JSON.stringify({ success: true, username, display: `@${username}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-username] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao gerar username' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
