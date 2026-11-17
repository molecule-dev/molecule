/**
 * SVG attributes shared by every OAuth provider logo component.
 *
 * Each logo renders the same normalized outer `<svg>` — 24×24 viewBox,
 * caller size on both axes, and the same accessibility attributes: a
 * non-empty `ariaLabel` opts into `role="img"` + `aria-label`; an empty
 * one marks the logo `aria-hidden` instead.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { OAuthLogoProps } from './types.js'

/**
 * Builds the attribute object every logo passes to its outer `h('svg', …)`.
 *
 * Mirrors `@molecule/app-oauth-logos-react`'s per-logo JSX attributes
 * exactly: `width`/`height` from `size` (default 20), `viewBox="0 0 24 24"`,
 * `translate="no"` (each logo's accessible name is a brand name, which stays
 * as written in every language), and the a11y trio driven by `ariaLabel`
 * (`role="img"` + `aria-label` when set, `aria-hidden` when it is `''`).
 * The `undefined` values Vue removes stand for React's omitted JSX attributes.
 *
 * @param props - The component's props, with its per-logo defaults resolved.
 * @returns The attribute object for `h('svg', …)`.
 */
export function logoSvgAttrs(props: OAuthLogoProps): Record<string, unknown> {
  const { size = 20, className, ariaLabel = '' } = props
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    translate: 'no',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    role: ariaLabel ? 'img' : undefined,
    'aria-label': ariaLabel || undefined,
    'aria-hidden': ariaLabel ? undefined : true,
    class: className,
  }
}

/**
 * The `<title>` children React renders when a `title` prop is set.
 *
 * @param title - The tooltip text, when present.
 * @returns The children list for `h()` (empty when there is no title).
 */
export function titleChildren(title: string | undefined): VNodeChild[] {
  return title ? [h('title', title)] : []
}
