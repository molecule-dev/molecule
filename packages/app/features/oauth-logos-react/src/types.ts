/**
 * Shared types for OAuth provider brand logos.
 *
 * @module
 */

/** Canonical list of supported providers. */
export type OAuthProviderId =
  | 'github'
  | 'gitlab'
  | 'google'
  | 'twitter'
  | 'x'
  | 'apple'
  | 'facebook'
  | 'microsoft'
  | 'linkedin'
  | 'discord'

/**
 *
 */
export interface OAuthLogoProps {
  /**
   * Rendered size in pixels (applied to both width and height). Defaults to 20.
   *
   * Every logo is authored at a normalized 24×24 viewBox so scaling is
   * identical across providers at any size — the logo's visual weight
   * matches exactly between apps.
   */
  size?: number
  /** Optional className on the outer SVG element. */
  className?: string
  /**
   * Color mode. Defaults to `'brand'` (official multi-color marks).
   * Use `'mono'` to render in `currentColor` — useful for uniform
   * monochrome rows that match the button text color.
   */
  mode?: 'brand' | 'mono'
  /**
   * Accessible label. Defaults to the provider's brand name
   * (e.g., `"GitHub"`, `"Google"`). Pass `''` to mark the logo
   * `aria-hidden` (typical when the button itself has an aria-label).
   */
  ariaLabel?: string
  /** Optional title rendered as `<title>` for hover tooltips. */
  title?: string
}
