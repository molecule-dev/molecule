/**
 * Types for the Svelte vendor / seller profile card.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link VendorCard} component. */
export interface VendorCardProps {
  /** Vendor / seller display name (a string or a snippet). */
  name: Snippet | string
  /** Optional logo URL — falls back to Avatar text initials. */
  logoSrc?: string
  /** Tagline / one-liner (a string or a snippet). */
  description?: Snippet | string
  /** 0-5 average rating. */
  rating?: number
  /** Total review count. */
  reviewCount?: number
  /** Member-since date display (a string or a snippet). */
  memberSince?: Snippet | string
  /** Optional badges row (Verified, Top seller, etc.). */
  badges?: Snippet | string
  /** Right-side actions (Follow, Message, Visit shop). */
  actions?: Snippet | string
  /** Optional click handler on the body. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
