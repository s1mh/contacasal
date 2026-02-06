// Shared PIN hashing - consistent across all functions
// Salt loaded from environment variable, with fallback for backward compatibility
const PIN_SALT = Deno.env.get('PIN_HASH_SALT') || 'couple_pin_salt_v1_';

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
