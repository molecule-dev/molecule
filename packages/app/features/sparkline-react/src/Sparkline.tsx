import { getClassMap } from '@molecule/app-ui'

interface SparklineProps {
  /** Numeric series — length determines the segment count. */
  values: number[]
  /** Visual variant. */
  variant?: 'line' | 'bar' | 'dot'
  /** SVG width in px. Defaults to 80. */
  width?: number
  /** SVG height in px. Defaults to 24. */
  height?: number
  /** Stroke / fill color. Defaults to currentColor. */
  color?: string
  /** Optional accessible label. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/**
 * Tiny inline trend chart — line, bar, or dot variants. Uses SVG with
 * no external library so it works inside cards, table cells, KPI tiles,
 * etc. without a chart bond.
 * @param root0
 * @param root0.values
 * @param root0.variant
 * @param root0.width
 * @param root0.height
 * @param root0.color
 * @param root0.ariaLabel
 * @param root0.className
 */
export function Sparkline({
  values,
  variant = 'line',
  width = 80,
  height = 24,
  color = 'currentColor',
  ariaLabel,
  className,
}: SparklineProps) {
  const cm = getClassMap()
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = values.length === 1 ? 0 : width / (values.length - 1)
  const y = (v: number) => height - ((v - min) / range) * height
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? 'Trend sparkline'}
      className={cm.cn(className)}
    >
      {variant === 'line' && (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          points={values.map((v, i) => `${i * stepX},${y(v)}`).join(' ')}
        />
      )}
      {variant === 'bar' &&
        values.map((v, i) => {
          const w = Math.max(2, width / values.length - 2)
          const h = ((v - min) / range) * height
          return <rect key={i} x={i * (w + 2)} y={height - h} width={w} height={h} fill={color} />
        })}
      {variant === 'dot' &&
        values.map((v, i) => <circle key={i} cx={i * stepX} cy={y(v)} r={1.5} fill={color} />)}
    </svg>
  )
}
