import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// Simple hash function for PIN verification
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username e PIN são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN deve ter 4 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize username (remove @ if present, lowercase)
    const normalizedUsername = username.replace(/^@/, '').toLowerCase().trim();

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find profile by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, couple_id, pin_code, pin_attempts, pin_locked_until, avatar_index, color, position')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (profileError) {
      console.error('[login-with-username] Profile query error:', profileError);
      throw profileError;
    }

    if (!profile) {
      // Don't reveal if username exists - generic error
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais inválidas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if account is locked
    if (profile.pin_locked_until) {
      const lockDate = new Date(profile.pin_locked_until);
      if (lockDate > new Date()) {
        console.log(`[login-with-username] Account locked for ${normalizedUsername}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Conta temporariamente bloqueada',
            locked: true,
            locked_until: profile.pin_locked_until
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify PIN
    const hashedInputPin = await hashPin(pin);
    const storedPin = profile.pin_code;
    
    let isValid = false;

    if (!storedPin) {
      // No PIN set - shouldn't happen but handle gracefully
      return new Response(
        JSON.stringify({ success: false, error: 'Configure seu perfil primeiro' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if stored PIN is hashed (64 chars) or plain (4 chars)
    if (storedPin.length === 64) {
      // Compare hashes
      isValid = hashedInputPin === storedPin;
    } else if (storedPin.length === 4) {
      // Plain text comparison (and upgrade to hash)
      isValid = pin === storedPin;
      
      if (isValid) {
        // Upgrade to hashed PIN
        await supabase
          .from('profiles')
          .update({ pin_code: hashedInputPin })
          .eq('id', profile.id);
        console.log(`[login-with-username] Upgraded PIN to hash for ${normalizedUsername}`);
      }
    }

    if (!isValid) {
      // Increment attempts
      const newAttempts = (profile.pin_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      
      const updateData: Record<string, unknown> = {
        pin_attempts: newAttempts,
      };
      
      if (shouldLock) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
        updateData.pin_locked_until = lockUntil.toISOString();
        updateData.pin_attempts = 0;
      }

      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      console.log(`[login-with-username] Failed attempt for ${normalizedUsername}, attempts: ${newAttempts}`);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: shouldLock ? 'Conta bloqueada temporariamente' : 'Credenciais inválidas',
          attempts_remaining: shouldLock ? 0 : MAX_ATTEMPTS - newAttempts,
          locked: shouldLock,
          locked_until: shouldLock ? updateData.pin_locked_until : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success - clear attempts
    await supabase
      .from('profiles')
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq('id', profile.id);

    // Get share code for the couple
    const { data: couple } = await supabase
      .from('couples')
      .select('share_code')
      .eq('id', profile.couple_id)
      .single();

    console.log(`[login-with-username] Login successful for ${normalizedUsername}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        profile: {
          id: profile.id,
          name: profile.name,
          avatar_index: profile.avatar_index,
          color: profile.color,
          position: profile.position
        },
        share_code: couple?.share_code,
        couple_id: profile.couple_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[login-with-username] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao fazer login' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
