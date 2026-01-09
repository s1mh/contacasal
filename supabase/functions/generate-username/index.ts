import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize name for username (remove accents, lowercase, replace spaces)
function normalizeForUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '') // Keep only alphanumeric
    .substring(0, 12); // Limit to 12 chars
}

// Generate random 4-char suffix
function generateSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
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

    // Try to generate unique username (max 10 attempts)
    let username = '';
    let attempts = 0;
    
    while (attempts < 10) {
      const suffix = generateSuffix();
      username = `${baseName}_${suffix}`;
      
      // Check if username exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      
      if (!existing) {
        break;
      }
      
      attempts++;
    }

    if (attempts >= 10) {
      // Fallback: use timestamp
      username = `${baseName}_${Date.now().toString(36).slice(-5)}`;
    }

    console.log(`[generate-username] Generated username: ${username} for name: ${name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        username,
        display: `@${username}`
      }),
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
