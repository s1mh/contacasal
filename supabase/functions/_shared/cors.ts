// Shared CORS configuration - restrict to known origins only
const ALLOWED_ORIGINS = [
  'https://contacasal.vercel.app',
  'http://localhost:8080',
  'http://localhost:5173',
  // Capacitor iOS/Android native app origins
  'capacitor://localhost',
  'https://localhost',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  // Only reflect the origin if it's in our allowlist; reject unknown origins
  const headers: Record<string, string> = {
    // Include custom debug header used by some functions (e.g. insights)
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ai-debug',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
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
