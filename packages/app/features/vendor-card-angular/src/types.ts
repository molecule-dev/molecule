/**
 * Types of `@molecule/app-vendor-card-angular` — the Angular counterpart of
 * `@molecule/app-vendor-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link VendorCard} — the same props
 * `@molecule/app-vendor-card-react` accepts. Node props (`name`,
 * `description`, `memberSince`, `badges`, `actions`) are projected content in
 * Angular (an input cannot carry a node), so they are typed `unknown`: pass a
 * string or number value through the input, and element content in the host
 * template as `[slot=<name>]` content.
 */
export interface VendorCardProps {
  /** Vendor / seller display name: text, or `[slot=name]` content. */
  name?: unknown
  /** Optional logo URL — falls back to Avatar text initials. */
  logoSrc?: string
  /** Tagline / one-liner: text, or `[slot=description]` content. */
  description?: unknown
  /** 0-5 average rating. */
  rating?: number
  /** Total review count. */
  reviewCount?: number
  /** Member-since date display: text, or `[slot=memberSince]` content. */
  memberSince?: unknown
  /** Optional badges row (Verified, Top seller, etc.): text, or `[slot=badges]` content. */
  badges?: unknown
  /** Right-side actions: text, or `[slot=actions]` content. */
  actions?: unknown
  /** Optional click handler on the body (a native `(click)` on the host element). */
  onClick?: unknown
  /** Extra classes. */
  className?: string
}
