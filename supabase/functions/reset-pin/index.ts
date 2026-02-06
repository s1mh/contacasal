import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { hashPin, isValidPin } from "../_shared/pin.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Token validation request
    if (body.validate_only) {
      const { token } = body;
      if (!token || token.length !== 64) {
        return new Response(
          JSON.stringify({ success: false, error: "Token inválido" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

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

      if (profile.recovery_token_expires_at) {
        if (new Date(profile.recovery_token_expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ success: false, error: "Token expirado. Solicite um novo link." }),
            { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      const { data: couple } = await supabase
        .from("couples")
        .select("share_code")
        .eq("id", profile.couple_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          profile: { name: profile.name, avatar_index: profile.avatar_index, color: profile.color },
          share_code: couple?.share_code
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // PIN reset request
    const { token, new_pin } = body;

    if (!token || token.length !== 64) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!new_pin || !isValidPin(new_pin)) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN deve ter 4 dígitos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, name, recovery_token_expires_at, couple_id, position, avatar_index, color")
      .eq("recovery_token", token)
      .single();

    if (fetchError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido ou expirado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (profile.recovery_token_expires_at) {
      if (new Date(profile.recovery_token_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Token expirado. Solicite um novo link." }),
          { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const hashedPin = await hashPin(new_pin);

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
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao atualizar PIN" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: couple } = await supabase
      .from("couples")
      .select("share_code")
      .eq("id", profile.couple_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Código redefinido com sucesso!",
        profile: { name: profile.name, position: profile.position, avatar_index: profile.avatar_index, color: profile.color },
        share_code: couple?.share_code
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in reset-pin:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
