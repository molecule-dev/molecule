/**
 * Types for the Solid vendor / seller profile card.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link VendorCard} component. */
export interface VendorCardProps {
  /** Vendor / seller display name. */
  name: JSX.Element
  /** Optional logo URL — falls back to Avatar text initials. */
  logoSrc?: string
  /** Tagline / one-liner. */
  description?: JSX.Element
  /** 0-5 average rating. */
  rating?: number
  /** Total review count. */
  reviewCount?: number
  /** Member-since date display. */
  memberSince?: JSX.Element
  /** Optional badges row (Verified, Top seller, etc.). */
  badges?: JSX.Element
  /** Right-side actions (Follow, Message, Visit shop). */
  actions?: JSX.Element
  /** Optional click handler on the body. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
