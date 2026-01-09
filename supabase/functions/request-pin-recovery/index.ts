import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  share_code: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { share_code, email }: RecoveryRequest = await req.json();

    if (!share_code || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Share code and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get couple by share code
    const { data: couple, error: coupleError } = await supabase
      .from("couples")
      .select("id")
      .eq("share_code", share_code.toLowerCase())
      .single();

    if (coupleError || !couple) {
      // Don't reveal if space exists - security best practice
      console.log("Couple not found for share code (silent):", share_code);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Se este e-mail estiver cadastrado, você receberá um link de recuperação." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find profile with matching email in this couple
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("couple_id", couple.id)
      .eq("email", email.toLowerCase())
      .single();

    if (profileError || !profile) {
      // Don't reveal if email exists - security best practice
      console.log("Profile not found for email (silent):", email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Se este e-mail estiver cadastrado, você receberá um link de recuperação." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate recovery token
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
      console.error("Error saving recovery token:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate recovery token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build recovery URL - use the origin from the request or fallback
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const recoveryUrl = `${origin}/reset-pin/${token}`;

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
              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">
                Recebemos uma solicitação para redefinir seu código pessoal. Clique no botão abaixo para criar um novo código:
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
      to: [email],
      subject: "🔐 Recuperar seu código - Conta de Casal",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send recovery email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Recovery email sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Se este e-mail estiver cadastrado, você receberá um link de recuperação." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in request-pin-recovery function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
