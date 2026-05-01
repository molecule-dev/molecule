/**
 * Per-provider brand background/foreground colors used as inline styles.
 *
 * These are values ClassMap cannot express — they are exact brand
 * spec colors mandated by each provider's developer guidelines (e.g.
 * Google's `#fff`, GitHub's `#24292f`). Layout, padding, radius, and
 * sizing all come from the wired ClassMap (`cm.oauthButton`,
 * `cm.oauthButtonGroup`, etc.) — only the brand color is inline.
 *
 * @module
 */

import type { OAuthProviderId } from '@molecule/app-oauth-logos-react'

/** Inline-style payload for a single brand button. */
export interface BrandStyle {
  /** Background color (CSS color token). */
  background: string
  /** Foreground / label color (CSS color token). */
  color: string
  /** Optional 1px border color when `background` is white/very light. */
  borderColor?: string
}

/**
 * Brand-spec colors for each supported OAuth provider.
 *
 * Sourced from each provider's official developer brand guidelines.
 * When a host app wants to override these (dark-mode tweaks, brand
 * exceptions), pass `iconMode="mono"` and let the wired ClassMap
 * paint everything via `cm.oauthButton`.
 */
export const BRAND_STYLES: Readonly<Record<OAuthProviderId, BrandStyle>> = Object.freeze({
  google: { background: '#ffffff', color: '#1f1f1f', borderColor: '#dadce0' },
  github: { background: '#24292f', color: '#ffffff' },
  gitlab: { background: '#fc6d26', color: '#ffffff' },
  twitter: { background: '#1da1f2', color: '#ffffff' },
  x: { background: '#000000', color: '#ffffff' },
  apple: { background: '#000000', color: '#ffffff' },
  facebook: { background: '#1877f2', color: '#ffffff' },
  microsoft: { background: '#2f2f2f', color: '#ffffff' },
  linkedin: { background: '#0a66c2', color: '#ffffff' },
  discord: { background: '#5865f2', color: '#ffffff' },
})

/**
 * Returns the inline `style` payload for a given provider id.
 *
 * Unknown providers receive an empty object so the wired ClassMap's
 * default surface color governs — matching the icon-only fallback
 * behavior of `<OAuthProviderLogo fallback={...} />`.
 *
 * @param provider - Canonical provider id (e.g. `'google'`).
 * @returns Inline-style object for the button element.
 */
export function getBrandStyle(provider: string): React.CSSProperties {
  const entry = BRAND_STYLES[provider as OAuthProviderId]
  if (!entry) return {}
  const out: React.CSSProperties = {
    background: entry.background,
    color: entry.color,
  }
  if (entry.borderColor) {
    out.borderColor = entry.borderColor
    out.borderStyle = 'solid'
    out.borderWidth = 1
  }
  return out
}
