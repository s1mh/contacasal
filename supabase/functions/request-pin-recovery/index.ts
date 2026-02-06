import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { isValidEmail } from "../_shared/sanitize.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const TOKEN_EXPIRY_MINUTES = 15;

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

interface RecoveryRequest {
  email: string;
  share_code?: string; // Now optional
}

interface ProfileWithCouple {
  id: string;
  name: string;
  email: string;
  couple_id: string;
  couples: {
    share_code: string;
  } | null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit: 3 requests per 5 minutes (prevent email spam)
    const { allowed } = await checkRateLimit(supabase, req, 'request-pin-recovery', 3, 5);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { share_code, email }: RecoveryRequest = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isValidEmail(email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase();
    let profiles: ProfileWithCouple[] = [];

    if (share_code) {
      // Mode 1: Specific share_code provided - find profile in that space
      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .select("id, share_code")
        .eq("share_code", share_code.toLowerCase())
        .single();

      if (coupleError || !couple) {
        // Couple not found - return generic response (no logging of share_code)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Se este e-mail estiver cadastrado, você receberá um link de recuperação." 
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, couple_id")
        .eq("couple_id", couple.id)
        .eq("email", normalizedEmail)
        .single();

      if (profile && !profileError) {
        profiles = [{
          ...profile,
          couples: { share_code: couple.share_code }
        }];
      }
    } else {
      // Mode 2: No share_code - find ALL profiles with this email
      const { data: foundProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id, 
          name, 
          email, 
          couple_id,
          couples!inner (
            share_code
          )
        `)
        .eq("email", normalizedEmail);

      if (!profilesError && foundProfiles) {
        // Transform the array couples to single object
        profiles = foundProfiles.map((p: any) => ({
          ...p,
          couples: Array.isArray(p.couples) ? p.couples[0] : p.couples
        })) as ProfileWithCouple[];
      }
    }

    // If no profiles found, return success message (security - don't reveal if email exists)
    if (profiles.length === 0) {
      // No profiles found - return generic response (no logging of email)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Se este e-mail estiver cadastrado, você receberá um link de recuperação." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build recovery URL origin
    const origin = req.headers.get("origin") || "https://contadecasal.app";

    // Process each profile found
    for (const profile of profiles) {
      // Generate unique recovery token for each profile
      const token = generateToken();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

      // Save token to profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          recovery_token: token,
          recovery_token_expires_at: expiresAt.toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Error saving recovery token");
        continue; // Skip to next profile
      }

      const recoveryUrl = `${origin}/reset-pin/${token}`;
      const shareCode = profile.couples?.share_code || '';
      const maskedCode = shareCode ? shareCode.slice(0, 4) + "****" : 'Espaço desconhecido';

      // Send email with beautiful template
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar Código - Conta de Casal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header with Cats -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <div style="display: flex; justify-content: center; align-items: center; gap: 8px;">
                <span style="font-size: 48px;">🐱</span>
                <span style="font-size: 24px; color: #f97316;">❤️</span>
                <span style="font-size: 48px;">🐱</span>
              </div>
              <h1 style="margin: 20px 0 0; font-size: 24px; font-weight: 700; color: #1f2937;">
                Recuperar Código
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">
                Conta de Casal
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
                Olá, <strong>${profile.name}</strong>! 👋
              </p>
              <p style="margin: 0 0 8px; font-size: 16px; color: #374151; line-height: 1.6;">
                Recebemos uma solicitação para redefinir seu código pessoal.
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Espaço: <strong>${maskedCode}</strong>
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${recoveryUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px 0 rgba(249, 115, 22, 0.39);">
                      🔐 Redefinir meu código
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Warning -->
              <div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #92400e; text-align: center;">
                  ⏰ Este link expira em <strong>${TOKEN_EXPIRY_MINUTES} minutos</strong>
                </p>
              </div>

              <!-- Security Note -->
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Se você não solicitou essa recuperação, pode ignorar este e-mail com segurança. Seu código atual permanecerá inalterado.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 40px;">
              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
                <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">
                  Conta de Casal
                </p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  Feito com 💕 por Samuel para o Juan
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "Conta de Casal <onboarding@resend.dev>",
        to: [normalizedEmail],
        subject: `🔐 Recuperar seu código - ${profile.name}`,
        html: emailHtml,
      });

      if (emailError) {
        console.error("Error sending recovery email");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Se este e-mail estiver cadastrado, você receberá um link de recuperação." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[request-pin-recovery] Error");
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
