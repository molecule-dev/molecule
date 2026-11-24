/**
 * Render an icon from the current icon set.
 *
 * @module
 */

import type React from 'react'

import { getIcon, type IconName } from '@molecule/app-icons'
import { Path, Svg, SvgMarkup } from '@molecule/app-ui-react/elements'

/**
 * Renders an icon by name as an SVG element, on React DOM and React Native.
 *
 * The SVG is marked `aria-hidden` + `focusable="false"`: every call site is
 * decorative chrome (close X, chevrons, status glyphs) whose accessible name
 * comes from the surrounding control's `aria-label`/text. Without this, some
 * screen reader/browser combos announce a stray "image" for each glyph.
 * A set's prebuilt glyph (`icon.svg`) is drawn from its markup, as the Icon component draws it.
 *
 * @param name - Icon name from the icon set
 * @param className - CSS class for sizing
 * @returns React SVG element
 */
export function renderIcon(name: IconName, className?: string): React.ReactElement {
  const icon = getIcon(name)
  const canvas = {
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
    focusable: false,
    className,
    viewBox: icon.viewBox || '0 0 20 20',
    fill: icon.fill || 'currentColor',
    stroke: icon.stroke,
    strokeWidth: icon.strokeWidth,
    strokeLinecap: icon.strokeLinecap,
    strokeLinejoin: icon.strokeLinejoin,
  }
  if (icon.svg) return <SvgMarkup {...canvas} markup={icon.svg} />
  return (
    <Svg {...canvas}>
      {icon.paths.map((p, i) => (
        <Path key={i} d={p.d} fillRule={p.fillRule} clipRule={p.clipRule} />
      ))}
    </Svg>
  )
}
