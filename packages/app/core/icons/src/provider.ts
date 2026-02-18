/**
 * Icon set bond accessor and icon lookup functions.
 *
 * Icon set bond packages (e.g. `@molecule/app-icons-molecule`) export an
 * `IconSet` object which is bonded via `setIconSet()`. Application code
 * uses `getIcon()` or `getIconDataUrl()` to retrieve individual icons.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { IconData, IconSet } from './types.js'

const BOND_TYPE = 'icon-set'

/**
 * Registers an icon set as the active singleton. Called at application
 * startup to wire an icon library.
 *
 * @param iconSet - The icon set (a record of icon names to icon data).
 */
export function setIconSet(iconSet: IconSet): void {
  bond(BOND_TYPE, iconSet)
}

/**
 * Retrieves the bonded icon set, throwing if none is configured.
 *
 * @returns The bonded icon set.
 * @throws {Error} If no icon set has been bonded.
 */
export function getIconSet(): IconSet {
  return bondRequire<IconSet>(BOND_TYPE)
}

/**
 * Checks whether an icon set is currently bonded.
 *
 * @returns `true` if an icon set is bonded.
 */
export function hasIconSet(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves a single icon by name from the bonded icon set.
 *
 * @param name - The icon name to look up.
 * @returns The icon data (paths, viewBox, stroke/fill attributes).
 * @throws {Error} If no icon set is bonded or the icon name is not found.
 */
export function getIcon(name: string): IconData {
  const iconSet = getIconSet()
  const icon = iconSet[name]
  if (!icon) {
    throw new Error(
      t(
        'icons.error.notFound',
        { name },
        { defaultValue: `Icon "${name}" not found in the current icon set.` },
      ),
    )
  }
  return icon
}

/**
 * Generates a CSS `url()` data URI containing an inline SVG for an icon.
 * Useful for `backgroundImage` styling of native elements (e.g. `<select>`
 * dropdown arrows) where SVG elements cannot be inserted.
 *
 * @param name - The icon name to render.
 * @param color - The stroke/fill color for the SVG (defaults to `'#6b7280'`).
 * @returns A CSS `url("data:image/svg+xml,...")` string.
 */
export function getIconDataUrl(name: string, color = '#6b7280'): string {
  const icon = getIcon(name)
  const viewBox = icon.viewBox || '0 0 20 20'
  const fill = icon.fill || 'currentColor'
  const encodedColor = encodeURIComponent(color)

  const pathsSvg = icon.svg
    ? icon.svg
    : icon.paths
        .map((p) => {
          const attrs = [`d='${p.d}'`]
          if (p.fill) attrs.push(`fill='${encodeURIComponent(p.fill)}'`)
          if (p.fillRule) attrs.push(`fill-rule='${p.fillRule}'`)
          if (p.clipRule) attrs.push(`clip-rule='${p.clipRule}'`)
          if (p.opacity !== undefined) attrs.push(`opacity='${p.opacity}'`)
          return `<path ${attrs.join(' ')} />`
        })
        .join('')

  const svgAttrs = [`xmlns='http://www.w3.org/2000/svg'`, `viewBox='${viewBox}'`]

  if (icon.stroke || fill === 'none') {
    svgAttrs.push(`fill='none'`)
    svgAttrs.push(`stroke='${encodedColor}'`)
    if (icon.strokeWidth) svgAttrs.push(`stroke-width='${icon.strokeWidth}'`)
    if (icon.strokeLinecap) svgAttrs.push(`stroke-linecap='${icon.strokeLinecap}'`)
    if (icon.strokeLinejoin) svgAttrs.push(`stroke-linejoin='${icon.strokeLinejoin}'`)
  } else {
    svgAttrs.push(`fill='${encodedColor}'`)
  }

  const svg = `<svg ${svgAttrs.join(' ')}>${pathsSvg}</svg>`
  const encoded = svg.replace(/</g, '%3c').replace(/>/g, '%3e').replace(/#/g, '%23')

  return `url("data:image/svg+xml,${encoded}")`
}
