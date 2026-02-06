// Shared PIN hashing - consistent across all functions
// Salt MUST be set via environment variable (Supabase secrets)

function getPinSalt(): string {
  const salt = Deno.env.get('PIN_HASH_SALT');
  if (!salt) {
    throw new Error('PIN_HASH_SALT environment variable is required');
  }
  return salt;
}

export async function hashPin(pin: string): Promise<string> {
  const salt = getPinSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate PIN format
export function isValidPin(pin: string): boolean {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}
