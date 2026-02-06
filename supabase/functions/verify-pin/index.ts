import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { hashPin, isValidPin } from "../_shared/pin.ts";
import { isValidUUID } from "../_shared/sanitize.ts";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT is valid
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { profile_id, pin } = await req.json();

    if (!profile_id || !isValidUUID(profile_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid profile ID" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!pin || !isValidPin(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN must be 4 digits" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get profile with security fields
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, pin_code, pin_attempts, pin_locked_until, name, email")
      .eq("id", profile_id)
      .single();

    if (fetchError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Credenciais inválidas" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if account is locked
    if (profile.pin_locked_until) {
      const lockUntil = new Date(profile.pin_locked_until);
      if (lockUntil > new Date()) {
        const remainingMinutes = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Conta bloqueada. Tente novamente em ${remainingMinutes} minuto${remainingMinutes > 1 ? "s" : ""}.`,
            locked: true,
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Hash the input PIN for comparison
    const hashedInputPin = await hashPin(pin);

    // Check if the stored PIN is hashed (64 chars) or plain text (4 chars)
    const storedPin = profile.pin_code;
    let pinMatches = false;

    if (storedPin && storedPin.length === 64) {
      pinMatches = storedPin === hashedInputPin;
    } else if (storedPin && storedPin.length === 4) {
      // Legacy plain text - compare directly and upgrade to hash
      pinMatches = storedPin === pin;
      if (pinMatches) {
        await supabase
          .from("profiles")
          .update({ pin_code: hashedInputPin })
          .eq("id", profile_id);
      }
    }

    if (!pinMatches) {
      const newAttempts = (profile.pin_attempts || 0) + 1;
      const remainingAttempts = MAX_ATTEMPTS - newAttempts;
      const updateData: Record<string, unknown> = { pin_attempts: newAttempts };

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        updateData.pin_locked_until = lockUntil.toISOString();
      }

      await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile_id);

      if (newAttempts >= MAX_ATTEMPTS) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Muitas tentativas incorretas. Conta bloqueada por ${LOCK_DURATION_MINUTES} minutos.`,
            locked: true,
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: remainingAttempts <= 2
            ? `Código incorreto. ${remainingAttempts} tentativa${remainingAttempts > 1 ? "s" : ""} restante${remainingAttempts > 1 ? "s" : ""}.`
            : "Código incorreto. Tente novamente.",
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // PIN correct - reset attempts
    await supabase
      .from("profiles")
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq("id", profile_id);

    return new Response(
      JSON.stringify({ success: true, profile_name: profile.name }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-pin:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
