// Input sanitization utilities for edge functions

// Strip HTML tags and dangerous characters from user input
export function sanitizeString(input: string, maxLength = 200): string {
  return input
    .replace(/<[^>]*>/g, '')        // Remove HTML tags
    .replace(/[<>"'`;(){}]/g, '')   // Remove dangerous characters
    .trim()
    .substring(0, maxLength);
}

// Sanitize name (allow accented chars, hyphens, apostrophes, spaces)
export function sanitizeName(input: string, maxLength = 50): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"`;(){}]/g, '')
    .trim()
    .substring(0, maxLength);
}

// Validate email format strictly
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

// Validate username format
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

// Validate UUID format
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
