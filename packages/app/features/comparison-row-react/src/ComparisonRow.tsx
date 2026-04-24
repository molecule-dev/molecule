import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ComparisonRowProps {
  /** Label for the metric (e.g. "Revenue"). */
  label: ReactNode
  /** Current period value (formatted). */
  current: ReactNode
  /** Previous period value (formatted). */
  previous?: ReactNode
  /** Numeric delta% — drives direction + color when present. */
  deltaPct?: number
  /** Custom delta formatter. */
  formatDelta?: (deltaPct: number) => ReactNode
  /** Optional sub-text ("vs. last week"). */
  periodLabel?: ReactNode
  /** Extra classes. */
  className?: string
}

const ARROW = (n: number) => (n > 0 ? '▲' : n < 0 ? '▼' : '–')
const COLOR = (n: number) => (n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#94a3b8')

/**
 * Period-over-period stat comparison row — current value, optional
 * previous value, and a coloured delta% chip. Used in dashboards,
 * report summaries, finance overviews.
 * @param root0
 * @param root0.label
 * @param root0.current
 * @param root0.previous
 * @param root0.deltaPct
 * @param root0.formatDelta
 * @param root0.periodLabel
 * @param root0.className
 */
export function ComparisonRow({
  label,
  current,
  previous,
  deltaPct,
  formatDelta,
  periodLabel,
  className,
}: ComparisonRowProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 'md' }), className)}
    >
      <div className={cm.stack(0 as const)}>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{label}</span>
        {periodLabel && <span className={cm.textSize('xs')}>{periodLabel}</span>}
      </div>
      <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
        <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{current}</span>
        {previous !== undefined && (
          <span
            className={cm.cn(cm.textSize('xs'))}
            style={{ textDecoration: 'line-through', opacity: 0.6 }}
          >
            {previous}
          </span>
        )}
        {deltaPct !== undefined && (
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            style={{ color: COLOR(deltaPct) }}
          >
            {formatDelta ? (
              formatDelta(deltaPct)
            ) : (
              <>
                {ARROW(deltaPct)} {Math.abs(deltaPct).toFixed(1)}%
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
