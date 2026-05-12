// ─── Founder & Creator Identity ─────────────────────────────────────────────
// Centralized creator config. The founder badge ("AURORA") is a unique,
// non-reproducible identity tier reserved for the platform creator.

export const FOUNDER_EMAIL = 'jovanf.fernandes@gmail.com';

export const CREATOR_TIERS = {
  founder: {
    email: FOUNDER_EMAIL,
    title: 'Head CEO',
    badgeName: 'AURORA',
    tagline: 'Founder & Head CEO of Akamo',
  },
} as const;

export function isFounder(email?: string | null): boolean {
  return email === FOUNDER_EMAIL;
}
