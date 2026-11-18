/**
 * Types for the Svelte auth-page brand header.
 *
 * Svelte counterpart of `@molecule/app-auth-brand-header-react`'s prop types:
 * the same prop names, with node-valued props typed as Svelte snippets.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Props accepted by the `AuthBrandHeaderChip` component.
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
 * Props accepted by the `AuthBrandHeaderWordmark` component.
 */
export interface AuthBrandHeaderWordmarkProps {
  /** The wordmark content — the brand name, or bespoke accented nodes. */
  children?: Snippet
  /** Inline color for the `<h1>`. */
  color?: string
  /** Extra classes appended to the default wordmark `<h1>` chrome. */
  className?: string
}

/**
 * Props accepted by the `AuthBrandHeaderTagline` component.
 */
export interface AuthBrandHeaderTaglineProps {
  /** The tagline content. */
  children?: Snippet
  /** Extra classes appended to the default tagline `<p>` chrome. */
  className?: string
}

/**
 * Props accepted by the `AuthBrandHeader` component.
 *
 * Pass a `children` snippet to compose the header from the exported chip /
 * wordmark / tagline components (or bespoke nodes). Omit it to use preset
 * mode — the `appName` / `tagline` / `icon` props render the default chip +
 * wordmark + tagline.
 */
export interface AuthBrandHeaderProps {
  /**
   * Composed header content. When set, the preset props below are ignored and
   * the content renders inside the centered wrapper `<div>`.
   */
  children?: Snippet
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
