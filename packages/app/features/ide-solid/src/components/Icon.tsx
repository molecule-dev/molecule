/**
 * Renders an SVG glyph looked up by name from the bonded `@molecule/app-icons`
 * set — the IDE's consistent, high-quality icon source (no unicode glyphs, no
 * ad-hoc inline `<path>`s).
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `Icon`: the same props
 * (React names), the same DOM for the same input. The raw-markup branch
 * injects the icon set's own SVG string through the element's `innerHTML`
 * property (React's `dangerouslySetInnerHTML`) — the bond is the trust
 * boundary. React's `...rest` spread is Solid's own: every extra SVG/HTML
 * attribute (`data-mol-id`, `aria-*`, `role`, event handlers, `style`) is
 * spread onto the root `<svg>` here. React keys the paths `key={i}`, so
 * `<Index>` — a position's node survives and its attributes update — matches.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createMemo, Index, splitProps } from 'solid-js'

import { getIcon, type IconName } from '@molecule/app-icons'

/**
 * Props for {@link Icon}. Extends the SVG element attributes so callers can
 * pass any SVG / HTML attribute the underlying `<svg>` accepts — React's
 * `...rest` spread (`data-mol-id`, `aria-*`, `role`, event handlers, `style`)
 * without the component enumerating them.
 */
export interface IconProps extends Omit<
  JSX.SvgSVGAttributes<SVGSVGElement>,
  'width' | 'height' | 'viewBox' | 'fill'
> {
  /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}

/**
 * Renders the named glyph from the bonded icon set.
 *
 * @param props - {@link IconProps}.
 * @returns An `<svg>` element rendering the named glyph.
 */
export function Icon(props: IconProps): JSX.Element {
  const [local, rest] = splitProps(props, ['name', 'size', 'className'])
  // Resolved per render pass (React's render is a pure function of the
  // props): an IIFE inside the JSX keeps every branch choice reactive, so a
  // `name` change swaps the glyph in place the way React re-renders.
  const icon = createMemo(() => getIcon(local.name))

  return (
    <>
      {(() => {
        const data = icon()
        const viewBox = data.viewBox || '0 0 20 20'

        if (data.svg) {
          return (
            <svg
              width={local.size ?? 16}
              height={local.size ?? 16}
              viewBox={viewBox}
              fill={data.fill || 'none'}
              class={local.className}
              innerHTML={data.svg}
              {...(rest as JSX.SvgSVGAttributes<SVGSVGElement>)}
            />
          )
        }

        const isStroked = !!data.stroke

        return (
          <svg
            width={local.size ?? 16}
            height={local.size ?? 16}
            viewBox={viewBox}
            fill={isStroked ? 'none' : data.fill || 'currentColor'}
            {...(isStroked
              ? {
                  stroke: data.stroke,
                  'stroke-width': data.strokeWidth,
                  'stroke-linecap': data.strokeLinecap,
                  'stroke-linejoin': data.strokeLinejoin,
                }
              : {})}
            class={local.className}
            {...(rest as JSX.SvgSVGAttributes<SVGSVGElement>)}
          >
            <Index each={data.paths}>
              {(p) => (
                <path
                  d={p().d}
                  {...(p().fill ? { fill: p().fill } : {})}
                  {...(p().fillRule ? { 'fill-rule': p().fillRule } : {})}
                  {...(p().clipRule ? { 'clip-rule': p().clipRule } : {})}
                  {...(p().opacity !== undefined ? { opacity: p().opacity } : {})}
                />
              )}
            </Index>
          </svg>
        )
      })()}
    </>
  )
}
