import { CAT_AVATARS, CAT_BG_COLORS } from '@/lib/constants';

export const AVATAR_COUNT = CAT_AVATARS.length;

export function normalizeAvatarIndex(avatarIndex: number): number {
  const n = Number(avatarIndex);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

export function getAvatarSrc(avatarIndex: number): string {
  const idx = normalizeAvatarIndex(avatarIndex);
  return CAT_AVATARS[idx - 1] || CAT_AVATARS[0];
}

export function getAvatarBgColor(avatarIndex: number): string {
  const idx = normalizeAvatarIndex(avatarIndex);
  return CAT_BG_COLORS[idx] || CAT_BG_COLORS[1];
}

export function getAvatarIndices(): number[] {
  return Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1);
}

