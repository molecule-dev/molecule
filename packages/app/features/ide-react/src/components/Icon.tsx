/**
 * Renders an SVG glyph looked up by name from the bonded `@molecule/app-icons`
 * set — the IDE's consistent, high-quality icon source (no unicode glyphs, no
 * ad-hoc inline `<path>`s).
 *
 * This is a thin renderer over the icon-set *contract* (`@molecule/app-icons`),
 * deliberately NOT a re-use of `@molecule/app-ui-react`'s `Icon`: that package
 * has no subpath exports, so importing it would pull its whole barrel — and its
 * `react-router-dom` peer — into this feature package. The contract is all the
 * IDE needs, and the host app already wires the icon set.
 *
 * @module
 */

import type { JSX, SVGProps } from 'react'

import { getIcon } from '@molecule/app-icons'

/**
 * Props for {@link Icon}. Extends `SVGProps` so callers can forward any SVG/HTML
 * attribute (`data-mol-id`, `aria-*`, `role`, event handlers, `style`) to the
 * root `<svg>` without the component enumerating them.
 */
export interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
  'width' | 'height' | 'viewBox' | 'fill'
> {
  /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
  name: string
  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}

/**
 * Renders the named glyph from the bonded icon set.
 * @param props - {@link IconProps}.
 * @returns An `<svg>` element rendering the named glyph.
 */
export function Icon({ name, size = 16, className, ...rest }: IconProps): JSX.Element {
  const icon = getIcon(name)
  const viewBox = icon.viewBox || '0 0 20 20'

  if (icon.svg) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill={icon.fill || 'none'}
        className={className}
        dangerouslySetInnerHTML={{ __html: icon.svg }}
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

Icon.displayName = 'Icon'
