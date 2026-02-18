/**
 * Icon rendering utility for Angular components.
 *
 * @module
 */

import { getIcon } from '@molecule/app-icons'

/**
 * Generates SVG markup string from an icon name.
 *
 * @param name - Icon name from the icon set
 * @param className - CSS class for sizing
 * @returns SVG markup string
 */
export function getIconSvg(name: string, className: string): string {
  const icon = getIcon(name)
  const viewBox = icon.viewBox || '0 0 20 20'
  const fill = icon.fill || 'currentColor'

  const attrs = [
    `xmlns="http://www.w3.org/2000/svg"`,
    `class="${className}"`,
    `viewBox="${viewBox}"`,
    `fill="${fill}"`,
  ]

  if (icon.stroke) attrs.push(`stroke="${icon.stroke}"`)
  if (icon.strokeWidth) attrs.push(`stroke-width="${icon.strokeWidth}"`)
  if (icon.strokeLinecap) attrs.push(`stroke-linecap="${icon.strokeLinecap}"`)
  if (icon.strokeLinejoin) attrs.push(`stroke-linejoin="${icon.strokeLinejoin}"`)

  const paths = icon.paths
    .map((p) => {
      const pathAttrs = [`d="${p.d}"`]
      if (p.fillRule) pathAttrs.push(`fill-rule="${p.fillRule}"`)
      if (p.clipRule) pathAttrs.push(`clip-rule="${p.clipRule}"`)
      return `<path ${pathAttrs.join(' ')} />`
    })
    .join('')

  return `<svg ${attrs.join(' ')}>${paths}</svg>`
}
