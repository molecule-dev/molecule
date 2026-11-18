/**
 * Types for the Vue GDPR cookie-consent banner.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Describes a single cookie category offered in the granular consent UI. */
export interface CookieCategory {
  /** Stable category id (also the key of the consent map). */
  id: string
  /** Display label (a VNode, a string, or null). */
  label: VNodeChild
  /** Optional explanation (a VNode, a string, or null). */
  description?: VNodeChild
  /** Whether this category is required (always on). */
  required?: boolean
  /** Initial enabled state. */
  defaultEnabled?: boolean
}

/**
 * Props accepted by {@link CookieBanner} — the same props
 * `@molecule/app-cookie-banner-react` accepts. Node-valued props (`title`,
 * `description`, category `label`/`description`) take a Vue `VNodeChild` (or a
 * string) instead of a React node.
 */
export interface CookieBannerProps {
  /** Cookie categories to offer (omit for a simple accept/reject banner). */
  categories?: CookieCategory[]
  /** Called when accept-all is clicked. */
  onAcceptAll?: () => void
  /** Called when reject-non-essential is clicked. */
  onRejectAll?: () => void
  /** Called when "Save preferences" is clicked. */
  onSave?: (enabled: Record<string, boolean>) => void
  /** Optional title. */
  title?: VNodeChild
  /** Optional description. */
  description?: VNodeChild
  /** Privacy policy link URL. */
  policyHref?: string
  /** Whether the banner is visible (controlled). */
  visible?: boolean
  /** Called when dismissed via Save / Accept / Reject. */
  onDismiss?: () => void
  /** Extra classes. */
  className?: string
}
