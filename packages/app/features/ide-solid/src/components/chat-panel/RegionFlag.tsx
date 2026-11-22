/**
 * RegionFlag — a model-region flag drawn from the bonded country-flag set.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `chat-panel/RegionFlag`:
 * the same code input, the same DOM sizing and the same textual fallback. The
 * bonded set's SVG markup ships with `viewBox`-only sizing, so its inner
 * dimensions are injected here; the hairline border keeps light flag edges
 * (e.g. the US stripes) from blending into a light surface. The markup is
 * trusted static artwork (a build-time dependency, never user input), so it is
 * injected verbatim through `innerHTML` — the same trust boundary React uses
 * with `dangerouslySetInnerHTML`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { getCountryFlag } from '@molecule/app-country-flags'

/** Props for {@link RegionFlag}. */
export interface RegionFlagProps {
  /** ISO/pseudo country code the flag set is looked up by. */
  code: string
  /** Total height in pixels, border included. */
  height: number
}

/**
 * Renders a region's rectangular flag from the bonded country-flag set at the
 * given total height, falling back to the uppercase code as text when no flag
 * set is bonded or the code has no flag.
 *
 * @param props - The flag's country code and total pixel height.
 * @returns The flag element, or the textual fallback.
 */
export function RegionFlag(props: RegionFlagProps): JSX.Element {
  const flag = getCountryFlag(props.code)
  if (!flag) {
    return (
      <span style={{ 'font-size': '10px', 'line-height': `${props.height}px` }}>
        {props.code.toUpperCase()}
      </span>
    )
  }
  const innerHeight = props.height - 2
  const innerWidth = Math.round(innerHeight * flag.aspectRatio)
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        border: '1px solid rgba(128,128,128,0.4)',
        'border-radius': '1px',
        overflow: 'hidden',
      }}
      innerHTML={flag.svg.replace(
        '<svg',
        `<svg width="${innerWidth}" height="${innerHeight}" style="display:block"`,
      )}
    />
  )
}
