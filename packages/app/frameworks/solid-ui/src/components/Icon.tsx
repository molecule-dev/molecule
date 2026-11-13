import { type Component, createMemo, For, type JSX, splitProps } from 'solid-js'

import { getIcon, type IconName } from '@molecule/app-icons'

/**
 * Props for {@link Icon}.
 *
 * Extends the SVG element attributes so callers can pass any SVG / HTML
 * attribute the underlying `<svg>` accepts, including `data-mol-id`,
 * `aria-*`, `role`, event handlers, `style`, etc. — without the
 * component needing to enumerate them.
 */
export interface IconProps extends Omit<
  JSX.SvgSVGAttributes<SVGSVGElement>,
  'width' | 'height' | 'viewBox' | 'fill'
> {
  /**
   * Name of the glyph to look up in the bonded icon set. Typed as
   * {@link IconName} so a typo fails the type-check instead of throwing at
   * render time; sets with extra glyphs augment `CustomIconNames` in
   * `@molecule/app-icons` to widen it.
   */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 20. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}

/**
 * Renders an SVG glyph looked up by `name` from the bonded
 * `@molecule/app-icons` set.
 *
 * Handles two icon-data shapes returned by the bond:
 *   1. Pre-rendered SVG markup (`icon.svg`) — injected through the
 *      element's `innerHTML` property. The bond is the trust boundary; only
 *      bond a set that controls its own SVG strings.
 *   2. Structured paths (`icon.paths`) — rendered as discrete `<path>`
 *      children, with optional stroke styling forwarded from the icon set.
 *
 * Any extra HTML/SVG attribute (e.g. `data-mol-id`, `aria-label`,
 * `role="img"`, `onClick`) is forwarded to the root `<svg>` via spread.
 *
 * Decorative by default: when the caller passes no `aria-label` /
 * `aria-labelledby` / `role`, the SVG is rendered `aria-hidden` +
 * `focusable="false"` so screen readers skip it (an unnamed inline SVG is
 * announced as a stray "image" by some combos). Passing any of those props
 * opts the icon into the accessibility tree.
 *
 * @param props - {@link IconProps}
 * @returns An `<svg>` element rendering the named glyph.
 */
export const Icon: Component<IconProps> = (props) => {
  const [local, rest] = splitProps(props, ['name', 'size', 'className'])

  const size = (): number => local.size ?? 20
  const icon = createMemo(() => {
    // Graceful degradation: an icon name missing from the bonded set (icon-set
    // version skew, a custom-set with a smaller catalog) must NOT crash the
    // whole app — multi-vendor-marketplace shipped a dead app over this. Warn
    // once per name and render a neutral placeholder circle instead.
    try {
      return getIcon(local.name)
    } catch (error) {
      console.warn(`Icon: no bonded glyph for "${local.name}" — rendering a placeholder.`, error)
      return null
    }
  })
  const viewBox = (): string => icon()?.viewBox || '0 0 20 20'
  const decorative = (): boolean =>
    (rest as { 'aria-label'?: unknown })['aria-label'] == null &&
    (rest as { 'aria-labelledby'?: unknown })['aria-labelledby'] == null &&
    (rest as { role?: unknown }).role == null

  const placeholder = (): JSX.Element => (
    <svg
      width={size()}
      height={size()}
      viewBox="0 0 20 20"
      fill="none"
      class={local.className}
      aria-hidden={decorative() ? 'true' : 'false'}
      attr:focusable="false"
      {...(rest as JSX.SvgSVGAttributes<SVGSVGElement>)}
    >
      <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
    </svg>
  )

  return (
    <>
      {(() => {
        const data = icon()
        if (!data) return placeholder()
        if (data.svg) {
          return (
            <svg
              width={size()}
              height={size()}
              viewBox={viewBox()}
              fill={data.fill || 'none'}
              class={local.className}
              // Placed BEFORE the rest spread so an explicit caller
              // aria-hidden/role wins.
              aria-hidden={decorative() ? 'true' : undefined}
              attr:focusable={decorative() ? 'false' : undefined}
              innerHTML={data.svg}
              {...(rest as JSX.SvgSVGAttributes<SVGSVGElement>)}
            />
          )
        }
        const isStroked = !!data.stroke
        return (
          <svg
            width={size()}
            height={size()}
            viewBox={viewBox()}
            fill={isStroked ? 'none' : data.fill || 'currentColor'}
            aria-hidden={decorative() ? 'true' : undefined}
            attr:focusable={decorative() ? 'false' : undefined}
            stroke={data.stroke}
            stroke-width={data.strokeWidth}
            stroke-linecap={data.strokeLinecap}
            stroke-linejoin={data.strokeLinejoin}
            class={local.className}
            {...(rest as JSX.SvgSVGAttributes<SVGSVGElement>)}
          >
            <For each={data.paths}>
              {(p) => (
                <path
                  d={p.d}
                  fill={p.fill}
                  fill-rule={p.fillRule}
                  clip-rule={p.clipRule}
                  opacity={p.opacity}
                />
              )}
            </For>
          </svg>
        )
      })()}
    </>
  )
}
