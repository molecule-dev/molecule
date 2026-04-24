import { getIcon } from '@molecule/app-icons'

interface IconProps {
  /** Icon name to look up in the wired `@molecule/app-icons` provider. */
  name: string
  /** Size in pixels applied to both width and height. Defaults to 20. */
  size?: number
  /** Optional extra classes. */
  className?: string
}

/**
 * React wrapper around `getIcon()` from `@molecule/app-icons`.
 *
 * Renders an `<svg>` reconstructed from the wired icon-set provider.
 * Supports raw SVG icons (`icon.svg`), stroked icons (`icon.stroke`,
 * `icon.strokeWidth`, etc.), and filled icons (`icon.paths`).
 */
export function Icon({ name, size = 20, className }: IconProps) {
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
