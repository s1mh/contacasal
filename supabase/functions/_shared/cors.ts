// Shared CORS configuration - restrict to known origins only
const ALLOWED_ORIGINS = [
  'https://contacasal.vercel.app',
  'http://localhost:8080',
  'http://localhost:5173',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  // Only reflect the origin if it's in our allowlist; reject unknown origins
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function handleCorsOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
