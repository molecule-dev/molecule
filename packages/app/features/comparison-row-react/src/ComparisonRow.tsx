import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

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
    <Box
      as="div"
      className={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 'md' }), className)}
    >
      <Box as="div" className={cm.stack(0 as const)}>
        <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {label}
        </Text>
        {periodLabel && (
          <Text as="span" className={cm.textSize('xs')}>
            {periodLabel}
          </Text>
        )}
      </Box>
      <Box as="div" className={cm.flex({ align: 'baseline', gap: 'sm' })}>
        <Text as="span" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {current}
        </Text>
        {previous !== undefined && (
          <Text
            as="span"
            className={cm.cn(cm.textSize('xs'))}
            style={{ opacity: 0.6 }}
            webStyle={{ textDecoration: 'line-through' }}
          >
            {previous}
          </Text>
        )}
        {deltaPct !== undefined && (
          <Text
            as="span"
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
          </Text>
        )}
      </Box>
    </Box>
  )
}
