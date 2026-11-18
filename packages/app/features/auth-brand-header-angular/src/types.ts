/**
 * Types for the Angular auth-page brand header.
 *
 * Angular counterpart of `@molecule/app-auth-brand-header-react`'s prop types:
 * the same prop names. Node-valued props (`children`) are projected content in
 * Angular, so they are typed `unknown`: pass them in the host template, not as
 * values.
 *
 * @module
 */

/**
 * Props accepted by {@link AuthBrandHeaderChip} — the same props
 * `@molecule/app-auth-brand-header-react` accepts.
 */
export interface AuthBrandHeaderChipProps {
  /** Material-symbol icon name shown inside the chip. */
  icon: string
  /**
   * CSS background value for the chip — typically a `linear-gradient(...)`.
   * Falls back to the wired ClassMap's `bg-primary` token when omitted, so
   * the chip's white icon glyph always has a colored backdrop.
   */
  chipGradient?: string
  /** Chip corner shape. `'round'` = `rounded-full`, `'square'` = `rounded-2xl`. */
  chipShape?: 'round' | 'square'
}

/**
 * Props accepted by {@link AuthBrandHeaderWordmark}.
 */
export interface AuthBrandHeaderWordmarkProps {
  /** The wordmark content, projected as the element's default content. */
  children?: unknown
  /** Inline color for the `<h1>`. */
  color?: string
  /** Extra classes appended to the default wordmark `<h1>` chrome. */
  className?: string
}

/**
 * Props accepted by {@link AuthBrandHeaderTagline}.
 */
export interface AuthBrandHeaderTaglineProps {
  /** The tagline content, projected as the element's default content. */
  children?: unknown
  /** Extra classes appended to the default tagline `<p>` chrome. */
  className?: string
}

/**
 * Props accepted by {@link AuthBrandHeader}.
 *
 * Pass content to compose the header from the chip / wordmark / tagline
 * components (or bespoke nodes) — it is projected in place of the preset.
 * Omit it to use preset mode — the `appName` / `tagline` / `icon` props render
 * the default chip + wordmark + tagline.
 */
export interface AuthBrandHeaderProps {
  /** Composed header content, projected as the element's default content. */
  children?: unknown
  /** Extra classes appended to the wrapper `<div>`. */
  className?: string
  /** Brand name for the default wordmark. */
  appName?: string
  /** Tagline for the default tagline line. */
  tagline?: string
  /** Material-symbol icon name for the default chip (omit for no chip). */
  icon?: string
  /** CSS background for the default chip. */
  chipGradient?: string
  /** Default chip corner shape. */
  chipShape?: 'round' | 'square'
  /** Inline color for the default wordmark `<h1>`. */
  wordmarkColor?: string
}
