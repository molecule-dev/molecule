/**
 * Layout-variant style payloads for `OAuthButtons`.
 *
 * The wired ClassMap (`cm.oauthButtonGroup`) supplies the row's gap,
 * width, padding, and brand-neutral chrome. This module only adds the
 * single CSS property each variant needs to flip its direction —
 * something the existing `cm.oauthButtonGroup` token does not express
 * and which would otherwise require modifying the ClassMap bond
 * package directly.
 *
 * Inline-style overrides are scoped to: `flex-direction`, `display`,
 * `grid-template-columns`, and `width: 100%` (vertical only). They never
 * collide with brand colors set via `getBrandStyle()` because they're
 * applied to the wrapper, not individual buttons.
 *
 * @module
 */

import type { OAuthButtonsLayout } from './types.js'

/**
 * Returns the inline `style` attribute value applied on top of
 * `cm.oauthButtonGroup` for a given layout variant, in Svelte's
 * inline-style format (a CSS declaration string for `style={…}`).
 *
 * @param layout - Selected layout variant.
 * @param providerCount - Number of buttons rendered (drives grid columns).
 * @returns CSS declarations for the wrapper element's `style` attribute.
 */
export function getLayoutStyle(layout: OAuthButtonsLayout, providerCount: number): string {
  switch (layout) {
    case 'vertical':
      return 'flex-direction: column; flex-wrap: nowrap'
    case 'grid': {
      const columns = providerCount > 4 ? 2 : Math.min(providerCount, 4)
      return `display: grid; grid-template-columns: repeat(${columns}, minmax(0, 1fr))`
    }
    case 'horizontal':
    default:
      return ''
  }
}

/**
 * Returns the inline `style` attribute value for an individual button in a
 * given layout, in Svelte's inline-style format. In `'vertical'` mode each
 * button stretches to fill the column.
 *
 * @param layout - Selected layout variant.
 * @returns CSS declarations for the button element's `style` attribute.
 */
export function getButtonLayoutStyle(layout: OAuthButtonsLayout): string {
  if (layout === 'vertical') return 'width: 100%'
  return ''
}
