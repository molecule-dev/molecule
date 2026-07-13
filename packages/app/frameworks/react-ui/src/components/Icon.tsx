import React, { type SVGProps } from 'react'

import { getIcon, type IconName } from '@molecule/app-icons'

/**
 * Props for {@link Icon}.
 *
 * Extends `SVGProps<SVGSVGElement>` so callers can pass any SVG / HTML
 * attribute the underlying `<svg>` accepts, including `data-mol-id`,
 * `aria-*`, `role`, event handlers, `style`, etc. — without the
 * component needing to enumerate them.
 */
export interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
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
 *   1. Pre-rendered SVG markup (`icon.svg`) — injected via
 *      `dangerouslySetInnerHTML`. The bond is the trust boundary; only
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
export function Icon({ name, size = 20, className, ...rest }: IconProps): React.JSX.Element {
  const icon = getIcon(name)
  const viewBox = icon.viewBox || '0 0 20 20'
  // Placed BEFORE {...rest} so an explicit caller aria-hidden/role wins.
  const decorativeProps =
    rest['aria-label'] == null && rest['aria-labelledby'] == null && rest.role == null
      ? ({ 'aria-hidden': true, focusable: 'false' } as const)
      : {}

  if (icon.svg) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill={icon.fill || 'none'}
        className={className}
        dangerouslySetInnerHTML={{ __html: icon.svg }}
        {...decorativeProps}
        {...rest}
      />
    )
  }

  const isStroked = !!icon.stroke

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={isStroked ? 'none' : icon.fill || 'currentColor'}
      {...decorativeProps}
      {...(isStroked
        ? {
            stroke: icon.stroke,
            strokeWidth: icon.strokeWidth,
            strokeLinecap: icon.strokeLinecap,
            strokeLinejoin: icon.strokeLinejoin,
          }
        : {})}
      className={className}
      {...rest}
    >
      {icon.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          {...(p.fill ? { fill: p.fill } : {})}
          {...(p.fillRule ? { fillRule: p.fillRule } : {})}
          {...(p.clipRule ? { clipRule: p.clipRule } : {})}
          {...(p.opacity !== undefined ? { opacity: p.opacity } : {})}
        />
      ))}
    </svg>
  )
}
