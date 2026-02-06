// Shared PIN hashing - consistent across all functions
// Salt MUST be set via environment variable (Supabase secrets)
const PIN_SALT = Deno.env.get('PIN_HASH_SALT');
if (!PIN_SALT) {
  throw new Error('PIN_HASH_SALT environment variable is required');
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(PIN_SALT + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate PIN format
export function isValidPin(pin: string): boolean {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}
