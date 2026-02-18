/**
 * Render an icon from the current icon set.
 *
 * @module
 */

import { h, type VNode } from 'vue'

import { getIcon } from '@molecule/app-icons'

/**
 * Renders an icon by name as a Vue VNode.
 * @param name - The name.
 * @param className - The CSS class name.
 * @returns The result.
 */
export function renderIcon(name: string, className?: string): VNode {
  const icon = getIcon(name)
  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
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
