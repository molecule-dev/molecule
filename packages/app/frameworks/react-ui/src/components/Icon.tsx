import type React from 'react'

import { getIcon, type IconName } from '@molecule/app-icons'
import type { CSSProperties, ElementProps, SvgPaintProps } from '@molecule/app-ui'
import { Circle, Path, Svg, SvgMarkup } from '@molecule/app-ui-react/elements'

/**
 * Props for {@link Icon}: the glyph, its size, and the attributes the root `<svg>` takes
 * (`aria-*`, `role`, `data-*` and `data-mol-id`, paint overrides such as `fill`, and `style`).
 */
export interface IconProps extends ElementProps, Omit<SvgPaintProps, 'className'> {
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
  /** CSS for the root `<svg>` on the web. */
  style?: CSSProperties
}

/**
 * Renders an SVG glyph looked up by `name` from the bonded
 * `@molecule/app-icons` set, on React DOM and React Native.
 *
 * Handles two icon-data shapes returned by the bond:
 *   1. Pre-rendered SVG markup (`icon.svg`), drawn by {@link SvgMarkup}. The bond is the trust
 *      boundary; only bond a set that controls its own SVG strings.
 *   2. Structured paths (`icon.paths`) — rendered as discrete `<path>`
 *      children, with optional stroke styling forwarded from the icon set.
 *
 * An icon without an accessible name (`aria-label`, `aria-labelledby` or a `role`) is decorative:
 * it is hidden from assistive technology and never takes focus.
 *
 * @param props - See {@link IconProps}.
 * @returns The icon.
 */
export function Icon({ name, size = 20, className, style, ...rest }: IconProps): React.JSX.Element {
  // Graceful degradation: an icon name missing from the bonded set (icon-set
  // version skew, a custom-set with a smaller catalog) must NOT crash the
  // whole app — multi-vendor-marketplace shipped a dead app over this. Warn
  // once per name and render a neutral placeholder circle instead.
  let icon: ReturnType<typeof getIcon>
  try {
    icon = getIcon(name)
  } catch (error) {
    console.warn(`Icon: no bonded glyph for "${name}" — rendering a placeholder.`, error)
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        className={className}
        aria-hidden={
          rest['aria-label'] == null && rest['aria-labelledby'] == null && rest.role == null
        }
        focusable={false}
        webStyle={style}
        {...rest}
      >
        <Circle cx={10} cy={10} r={8} fill="currentColor" opacity={0.15} />
      </Svg>
    )
  }

  const viewBox = icon.viewBox || '0 0 20 20'
  // Placed BEFORE {...rest} so an explicit caller aria-hidden/role wins.
  const decorativeProps =
    rest['aria-label'] == null && rest['aria-labelledby'] == null && rest.role == null
      ? ({ 'aria-hidden': true, focusable: false } as const)
      : {}

  if (icon.svg) {
    return (
      <SvgMarkup
        width={size}
        height={size}
        viewBox={viewBox}
        fill={icon.fill || 'none'}
        className={className}
        markup={icon.svg}
        {...decorativeProps}
        webStyle={style}
        {...rest}
      />
    )
  }

  const isStroked = !!icon.stroke
  return (
    <Svg
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
      webStyle={style}
      {...rest}
    >
      {icon.paths.map((p, i) => (
        <Path
          key={i}
          d={p.d}
          {...(p.fill ? { fill: p.fill } : {})}
          {...(p.fillRule ? { fillRule: p.fillRule } : {})}
          {...(p.clipRule ? { clipRule: p.clipRule } : {})}
          {...(p.opacity !== undefined ? { opacity: p.opacity } : {})}
        />
      ))}
    </Svg>
  )
}
