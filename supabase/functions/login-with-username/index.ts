import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { hashPin, isValidPin } from '../_shared/pin.ts';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais inválidas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidPin(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais inválidas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize username
    const normalizedUsername = username.replace(/^@/, '').toLowerCase().trim();

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
      // Generic error - don't reveal if username exists
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais inválidas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if account is locked
    if (profile.pin_locked_until) {
      const lockDate = new Date(profile.pin_locked_until);
      if (lockDate > new Date()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Conta temporariamente bloqueada',
            locked: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify PIN using shared hashing (WITH salt)
    const hashedInputPin = await hashPin(pin);
    const storedPin = profile.pin_code;

    let isValid = false;

    if (!storedPin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais inválidas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (storedPin.length === 64) {
      // Compare hashes
      isValid = hashedInputPin === storedPin;
    } else if (storedPin.length === 4) {
      // Legacy plain text - compare and upgrade
      isValid = pin === storedPin;
      if (isValid) {
        await supabase
          .from('profiles')
          .update({ pin_code: hashedInputPin })
          .eq('id', profile.id);
      }
    }

    if (!isValid) {
      const newAttempts = (profile.pin_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;

      const updateData: Record<string, unknown> = { pin_attempts: newAttempts };
      if (shouldLock) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
        updateData.pin_locked_until = lockUntil.toISOString();
        updateData.pin_attempts = 0;
      }

      await supabase.from('profiles').update(updateData).eq('id', profile.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: shouldLock ? 'Conta bloqueada temporariamente' : 'Credenciais inválidas',
          locked: shouldLock,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success - clear attempts
    await supabase
      .from('profiles')
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq('id', profile.id);

    // Get share code
    const { data: couple } = await supabase
      .from('couples')
      .select('share_code')
      .eq('id', profile.couple_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profile.id,
          name: profile.name,
          avatar_index: profile.avatar_index,
          color: profile.color,
          position: profile.position,
        },
        share_code: couple?.share_code,
        couple_id: profile.couple_id,
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
