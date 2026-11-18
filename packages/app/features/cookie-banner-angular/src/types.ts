/**
 * Types of `@molecule/app-cookie-banner-angular` — the Angular counterpart of
 * `@molecule/app-cookie-banner-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A React-node-valued field: plain text as it is, or a projected template (the
 * Angular representation of a node value inside a data prop). Module-internal:
 * React's package exports no such helper type.
 */
type NodeValue = TemplateRef<unknown> | string | number | boolean | null | undefined

/** Describes a single cookie category offered in the granular consent UI. */
export interface CookieCategory {
  /** Stable category id (also the key of the consent map). */
  id: string
  /** Display label — text, or a projected template. */
  label: NodeValue
  /** Optional explanation — text, or a projected template. */
  description?: NodeValue
  /** Whether this category is required (always on). */
  required?: boolean
  /** Initial enabled state. */
  defaultEnabled?: boolean
}

/**
 * Props accepted by {@link CookieBanner} — the same props
 * `@molecule/app-cookie-banner-react` accepts. Node props (`title`,
 * `description`) are projected content in Angular (an input cannot carry a
 * node), so they are typed `unknown`: pass them in the host template, not as
 * values. `visible` defaults to true at read time.
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
  /** Optional title, projected as `[slot=title]` content or passed as text. */
  title?: unknown
  /** Optional description, projected as `[slot=description]` content or passed as text. */
  description?: unknown
  /** Privacy policy link URL. */
  policyHref?: string
  /** Whether the banner is visible (controlled). */
  visible?: boolean
  /** Called when dismissed via Save / Accept / Reject. */
  onDismiss?: () => void
  /** Extra classes. */
  className?: string
}
