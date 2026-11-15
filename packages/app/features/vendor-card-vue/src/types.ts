/**
 * Types for the Vue vendor / seller profile card.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link VendorCard} component. */
export interface VendorCardProps {
  /** Vendor / seller display name. */
  name: VNodeChild
  /** Optional logo URL — falls back to Avatar text initials. */
  logoSrc?: string
  /** Tagline / one-liner. */
  description?: VNodeChild
  /** 0-5 average rating. */
  rating?: number
  /** Total review count. */
  reviewCount?: number
  /** Member-since date display. */
  memberSince?: VNodeChild
  /** Optional badges row (Verified, Top seller, etc.). */
  badges?: VNodeChild
  /** Right-side actions (Follow, Message, Visit shop). */
  actions?: VNodeChild
  /** Optional click handler on the body. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
