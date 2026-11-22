/**
 * RegionFlag — a model-region flag drawn from the bonded country-flag set.
 *
 * @module
 */

import type { JSX } from 'react'

import { getCountryFlag } from '@molecule/app-country-flags'

/**
 * Renders a region's rectangular flag from the bonded country-flag set at the
 * given total height, falling back to the uppercase code as text when no flag
 * set is bonded or the code has no flag. The SVG markup ships with
 * viewBox-only sizing, so the inner dimensions are injected here; the hairline
 * border keeps light flag edges (e.g. the US stripes) from blending into a
 * light surface.
 *
 * @param props - `code` (ISO/pseudo country code) and total `height` in px
 *   (border included).
 * @returns The flag element, or the textual fallback.
 */
export function RegionFlag({ code, height }: { code: string; height: number }): JSX.Element {
  const flag = getCountryFlag(code)
  if (!flag) {
    return <span style={{ fontSize: '10px', lineHeight: `${height}px` }}>{code.toUpperCase()}</span>
  }
  const innerHeight = height - 2
  const innerWidth = Math.round(innerHeight * flag.aspectRatio)
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        border: '1px solid rgba(128,128,128,0.4)',
        borderRadius: 1,
        overflow: 'hidden',
      }}
      // The bonded set's markup is trusted static artwork (a build-time
      // dependency, never user input), so injecting it verbatim is safe.
      dangerouslySetInnerHTML={{
        __html: flag.svg.replace(
          '<svg',
          `<svg width="${innerWidth}" height="${innerHeight}" style="display:block"`,
        ),
      }}
    />
  )
}
