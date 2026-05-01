/**
 * Layout-variant style payloads for `<OAuthButtons />`.
 *
 * The wired ClassMap (`cm.oauthButtonGroup`) supplies the row's gap,
 * width, padding, and brand-neutral chrome. This module only adds the
 * single CSS property each variant needs to flip its direction —
 * something the existing `cm.oauthButtonGroup` token does not express
 * and which would otherwise require modifying the ClassMap bond
 * package directly.
 *
 * Inline-style overrides are scoped to: `flexDirection`, `display`,
 * `gridTemplateColumns`, and `width: 100%` (vertical only). They never
 * collide with brand colors set via `getBrandStyle()` because they're
 * applied to the wrapper, not individual buttons.
 *
 * @module
 */

import type { OAuthButtonsLayout } from './types.js'

/**
 * Returns the inline-style overlay applied on top of `cm.oauthButtonGroup`
 * for a given layout variant.
 *
 * @param layout - Selected layout variant.
 * @param providerCount - Number of buttons rendered (drives grid columns).
 * @returns Inline-style object to spread onto the wrapper element.
 */
export function getLayoutStyle(
  layout: OAuthButtonsLayout,
  providerCount: number,
): React.CSSProperties {
  switch (layout) {
    case 'vertical':
      return { flexDirection: 'column', flexWrap: 'nowrap' }
    case 'grid': {
      const columns = providerCount > 4 ? 2 : Math.min(providerCount, 4)
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }
    }
    case 'horizontal':
    default:
      return {}
  }
}

/**
 * Returns the inline-style overlay for an individual button in a given
 * layout. In `'vertical'` mode each button stretches to fill the column.
 *
 * @param layout - Selected layout variant.
 * @returns Inline-style object to spread onto the button element.
 */
export function getButtonLayoutStyle(layout: OAuthButtonsLayout): React.CSSProperties {
  if (layout === 'vertical') return { width: '100%' }
  return {}
}
