// ─── Founder & Creator Identity ─────────────────────────────────────────────
// Centralized creator config. The founder badge ("AURORA") is a unique,
// non-reproducible identity tier reserved for the platform creator.
// Owner status is enforced server-side via the `role` column in the
// `profiles` table. The email fallback is kept for legacy data only.

export const FOUNDER_EMAIL = 'jovanf.fernandes@gmail.com';

export const CREATOR_TIERS = {
  founder: {
    email: FOUNDER_EMAIL,
    title: 'Head CEO',
    badgeName: 'AURORA',
    tagline: 'Founder & Head CEO of Akamo',
  },
} as const;

/**
 * Server-authoritative owner check via profile role.
 * Preferred over email-based detection.
 */
export function isOwner(role?: string | null): boolean {
  return role === 'owner';
}

/**
 * Legacy email-based founder check.
 * Used as fallback when profile data isn't available (e.g. on track records).
 * For new code, prefer `isOwner(profile.role)`.
 */
export function isFounder(email?: string | null): boolean {
  return email === FOUNDER_EMAIL;
}
