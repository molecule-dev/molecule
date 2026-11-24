import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link ComparisonRow}. */
export interface ComparisonRowProps {
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

const ARROW = (n: number): string => (n > 0 ? '▲' : n < 0 ? '▼' : '–')

/**
 * The semantic tone colouring the delta: the theme's success green for a
 * rise, its error red for a fall, its secondary grey for no change.
 */
const TONE = (n: number): ColorVariant => (n > 0 ? 'success' : n < 0 ? 'error' : 'secondary')

/**
 * Period-over-period stat comparison row — current value, optional
 * previous value, and a coloured delta% chip. Used in dashboards,
 * report summaries, finance overviews.
 * @param props - Component props (see {@link ComparisonRowProps}).
 */
export function ComparisonRow({
  label,
  current,
  previous: previousProp,
  deltaPct,
  formatDelta,
  periodLabel: periodLabelProp,
  className,
}: ComparisonRowProps): JSX.Element {
  const previous = slot(previousProp)
  const periodLabel = slot(periodLabelProp)
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
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textTone(TONE(deltaPct)),
            )}
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
