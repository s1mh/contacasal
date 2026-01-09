import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Salt for PIN hashing - in production, use a proper secret
const PIN_SALT = "couple_pin_salt_v1_";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// Hash PIN using SHA-256
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(PIN_SALT + pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

interface VerifyPinRequest {
  profile_id: string;
  pin: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { profile_id, pin }: VerifyPinRequest = await req.json();

    if (!profile_id || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: "Profile ID and PIN are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
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
      console.error("Error fetching profile:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
            error: `Conta bloqueada. Tente novamente em ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}.`,
            locked: true,
            locked_until: profile.pin_locked_until
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
      // Already hashed - compare hashes
      pinMatches = storedPin === hashedInputPin;
    } else if (storedPin && storedPin.length === 4) {
      // Plain text (legacy) - compare directly and update to hash
      pinMatches = storedPin === pin;
      
      if (pinMatches) {
        // Upgrade to hashed PIN
        await supabase
          .from("profiles")
          .update({ pin_code: hashedInputPin })
          .eq("id", profile_id);
        console.log("Upgraded PIN to hashed version for profile:", profile_id);
      }
    }

    if (!pinMatches) {
      // Increment attempts
      const newAttempts = (profile.pin_attempts || 0) + 1;
      const remainingAttempts = MAX_ATTEMPTS - newAttempts;
      
      const updateData: Record<string, unknown> = { pin_attempts: newAttempts };
      
      // Lock account if max attempts reached
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
            attempts_remaining: 0
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: remainingAttempts <= 2 
            ? `Código incorreto. ${remainingAttempts} tentativa${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.`
            : "Código incorreto. Tente novamente.",
          attempts_remaining: remainingAttempts
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // PIN correct - reset attempts and unlock
    await supabase
      .from("profiles")
      .update({ 
        pin_attempts: 0, 
        pin_locked_until: null 
      })
      .eq("id", profile_id);

    console.log("PIN verified successfully for profile:", profile_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        profile_name: profile.name
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-pin function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
