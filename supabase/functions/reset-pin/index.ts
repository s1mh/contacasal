import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Salt for PIN hashing - must match verify-pin function
const PIN_SALT = "couple_pin_salt_v1_";

// Hash PIN using SHA-256
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(PIN_SALT + pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

interface ResetPinRequest {
  token: string;
  new_pin: string;
}

interface ValidateTokenRequest {
  token: string;
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

    const body = await req.json();

    // Check if this is a token validation request (GET-like behavior via POST)
    if (body.validate_only) {
      const { token }: ValidateTokenRequest = body;

      if (!token || token.length !== 64) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid token format" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find profile with this recovery token
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("id, name, avatar_index, color, recovery_token_expires_at, couple_id")
        .eq("recovery_token", token)
        .single();

      if (fetchError || !profile) {
        return new Response(
          JSON.stringify({ success: false, error: "Token inválido ou expirado" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if token is expired
      if (profile.recovery_token_expires_at) {
        const expiresAt = new Date(profile.recovery_token_expires_at);
        if (expiresAt < new Date()) {
          return new Response(
            JSON.stringify({ success: false, error: "Token expirado. Solicite um novo link de recuperação." }),
            { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      // Get share code for redirect
      const { data: couple } = await supabase
        .from("couples")
        .select("share_code")
        .eq("id", profile.couple_id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          profile: {
            name: profile.name,
            avatar_index: profile.avatar_index,
            color: profile.color,
          },
          share_code: couple?.share_code
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // This is a PIN reset request
    const { token, new_pin }: ResetPinRequest = body;

    if (!token || token.length !== 64) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!new_pin || new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN must be 4 digits" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find profile with this recovery token
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, name, recovery_token_expires_at, couple_id, position, avatar_index, color")
      .eq("recovery_token", token)
      .single();

    if (fetchError || !profile) {
      console.error("Token not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido ou expirado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if token is expired
    if (profile.recovery_token_expires_at) {
      const expiresAt = new Date(profile.recovery_token_expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Token expirado. Solicite um novo link de recuperação." }),
          { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Hash the new PIN
    const hashedPin = await hashPin(new_pin);

    // Update profile with new PIN and clear recovery token
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        pin_code: hashedPin,
        recovery_token: null,
        recovery_token_expires_at: null,
        pin_attempts: 0,
        pin_locked_until: null,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating PIN:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update PIN" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get share code for redirect
    const { data: couple } = await supabase
      .from("couples")
      .select("share_code")
      .eq("id", profile.couple_id)
      .single();

    console.log("PIN reset successfully for profile:", profile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Código redefinido com sucesso!",
        profile: {
          name: profile.name,
          position: profile.position,
          avatar_index: profile.avatar_index,
          color: profile.color,
        },
        share_code: couple?.share_code
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in reset-pin function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
