/**
 * Render an icon from the current icon set.
 *
 * @module
 */

import type React from 'react'

import { getIcon, type IconName } from '@molecule/app-icons'

import type * as SvgElements from '../elements/Svg.js'

/**
 * Renders an icon by name as an SVG element, on React DOM and React Native.
 *
 * The SVG is marked `aria-hidden` + `focusable="false"`: every call site is
 * decorative chrome (close X, chevrons, status glyphs) whose accessible name
 * comes from the surrounding control's `aria-label`/text. Without this, some
 * screen reader/browser combos announce a stray "image" for each glyph.
 * A set's prebuilt glyph (`icon.svg`) is drawn from its markup, as the Icon component draws it.
 *
 * @param hosts - Renderer implementations of the SVG elements.
 * @returns The icon renderer.
 */
export function createIconRenderer(hosts: {
  Path: typeof SvgElements.Path
  Svg: typeof SvgElements.Svg
  SvgMarkup: typeof SvgElements.SvgMarkup
}): (name: IconName, className?: string) => React.ReactElement {
  const { Path, Svg, SvgMarkup } = hosts
  return function renderIcon(name, className) {
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
}
