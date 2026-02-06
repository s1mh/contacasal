// Database-backed rate limiter for edge functions
// Uses the rate_limits table to track request counts per IP+endpoint

export async function checkRateLimit(
  supabase: any,
  req: Request,
  endpoint: string,
  maxRequests = 10,
  windowMinutes = 1
): Promise<{ allowed: boolean; remaining: number }> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Count recent requests in window
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart);

  const currentCount = count || 0;

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  await supabase
    .from('rate_limits')
    .insert({ ip_address: ip, endpoint: endpoint });

  // Probabilistic cleanup of old entries (10% chance, keeps table small)
  if (Math.random() < 0.1) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', oneHourAgo);
  }

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ success: false, error: 'Muitas requisições. Tente novamente em alguns minutos.' }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
  );
}
