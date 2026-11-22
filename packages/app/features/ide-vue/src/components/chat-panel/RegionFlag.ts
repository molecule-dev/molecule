/**
 * The model region's flag — Vue counterpart of React's `RegionFlag`.
 *
 * Draws a region's rectangular flag from the bonded country-flag set at the
 * given total height, falling back to the uppercase code as text when no flag
 * set is bonded or the code has no flag. The bonded set's SVG ships with
 * viewBox-only sizing, so the inner dimensions are injected here; the hairline
 * border keeps light flag edges (e.g. the US stripes) from blending into a
 * light surface.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { getCountryFlag } from '@molecule/app-country-flags'

/**
 * Renders a region's flag, or the textual code when no flag is bonded.
 *
 * @param code - The ISO/pseudo country code to look up.
 * @param height - The flag's total height in pixels (border included).
 * @returns The flag element, or the uppercase-code fallback.
 */
export function renderRegionFlag(code: string, height: number): VNodeChild {
  const flag = getCountryFlag(code)
  if (!flag) {
    return h('span', { style: { fontSize: '10px', lineHeight: `${height}px` } }, code.toUpperCase())
  }
  const innerHeight = height - 2
  const innerWidth = Math.round(innerHeight * flag.aspectRatio)
  return h('span', {
    'aria-hidden': 'true',
    style: {
      display: 'inline-flex',
      border: '1px solid rgba(128,128,128,0.4)',
      borderRadius: '1px',
      overflow: 'hidden',
    },
    // The bonded set's markup is trusted static artwork (a build-time
    // dependency, never user input), so injecting it verbatim is safe — React
    // does the same through `dangerouslySetInnerHTML`.
    innerHTML: flag.svg.replace(
      '<svg',
      `<svg width="${innerWidth}" height="${innerHeight}" style="display:block"`,
    ),
  })
}
