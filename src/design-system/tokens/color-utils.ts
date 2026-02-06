export function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function expandHexShort(hex: string): string {
  // "#abc" -> "#aabbcc"
  return (
    '#' +
    hex
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')
  );
}

export function hexToRgba(hex: string, alpha: number): string {
  if (!isHexColor(hex)) return hex;

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const normalized = hex.length === 4 ? expandHexShort(hex) : hex;
  const raw = normalized.slice(1);

  // Support #RRGGBB and #RRGGBBAA
  const hasAlpha = raw.length === 8;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return hex;

  const a = hasAlpha ? parseInt(raw.slice(6, 8), 16) / 255 : clampedAlpha;
  const finalAlpha = Math.max(0, Math.min(1, hasAlpha ? a : clampedAlpha));

  return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
}

export function withAlpha(color: string, alpha: number): string {
  // Currently, tags/cards store hex colors.\n
  // If a non-hex color is passed (e.g. `hsl(...)`), we just return it.
  if (!color) return color;
  if (isHexColor(color)) return hexToRgba(color, alpha);
  return color;
}

