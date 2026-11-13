/**
 * Render an icon from the current icon set.
 *
 * @module
 */

import { h, type VNode } from 'vue'

import { getIcon, type IconName } from '@molecule/app-icons'

/**
 * Renders an icon by name as a Vue VNode.
 *
 * The SVG is marked `aria-hidden` + `focusable="false"` (exactly like
 * `@molecule/app-ui-react`'s renderIcon): every call site is decorative
 * chrome (close X, chevrons, status glyphs) whose accessible name comes from
 * the surrounding control's `aria-label`/text.
 *
 * @param name - Icon name from the icon set.
 * @param className - CSS class for sizing.
 * @returns The icon as a Vue VNode.
 */
export function renderIcon(name: IconName, className?: string): VNode {
  const icon = getIcon(name)
  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': true,
      focusable: 'false',
      class: className,
      viewBox: icon.viewBox || '0 0 20 20',
      fill: icon.fill || 'currentColor',
      stroke: icon.stroke,
      'stroke-width': icon.strokeWidth,
      'stroke-linecap': icon.strokeLinecap,
      'stroke-linejoin': icon.strokeLinejoin,
    },
    icon.paths.map((p) =>
      h('path', {
        d: p.d,
        'fill-rule': p.fillRule,
        'clip-rule': p.clipRule,
      }),
    ),
  )
}
