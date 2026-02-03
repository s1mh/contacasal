import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check if a profile has been configured (not default placeholder names)
export function isConfiguredProfile(profile: { name: string }): boolean {
  return profile.name !== 'Pessoa 1' && profile.name !== 'Pessoa 2' && profile.name !== 'Pessoa';
}
