import type React from 'react'
import type { ReactNode } from 'react'

import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Props for the {@link TrendChip} component. */
export interface TrendChipProps {
  /** Numeric delta to display. Sign drives direction unless `direction` is set. */
  delta: number
  /** Explicit direction override. */
  direction?: 'up' | 'down' | 'flat'
  /** Suffix appended to the delta. Defaults to '%'. */
  suffix?: string
  /** Optional prefix for the value. */
  prefix?: ReactNode
  /** Style preset. `'subtle'` = inline plain, `'pill'` = colored pill. Defaults to `'subtle'`. */
  variant?: 'subtle' | 'pill'
  /** Optional accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

const ARROW = { up: '▲', down: '▼', flat: '–' } as const

/**
 * The semantic tone colouring each direction: the theme's success green for a
 * rise, its error red for a fall, its muted secondary grey for no change.
 */
const TONE: Record<'up' | 'down' | 'flat', ColorVariant> = {
  up: 'success',
  down: 'error',
  flat: 'secondary',
} as const

/**
 * Standalone trend delta chip — `▲ 12%` style display for inline
 * placement in row/header/cell contexts. Different from
 * `<KpiCardTrend>` in being usable outside of a KPI card.
 * @param props - Component props (see {@link TrendChipProps}).
 */
export function TrendChip({
  delta,
  direction,
  suffix = '%',
  prefix,
  variant = 'subtle',
  ariaLabel,
  className,
}: TrendChipProps): React.JSX.Element {
  const cm = getClassMap()
  const dir = direction ?? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')
  const tone = TONE[dir]
  return (
    <span
      aria-label={ariaLabel ?? `${prefix ?? ''}${ARROW[dir]} ${Math.abs(delta)}${suffix}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        variant === 'pill' ? cm.cn(cm.bgTone(tone), cm.textOnTone) : cm.textTone(tone),
        className,
      )}
      style={variant === 'pill' ? { padding: '2px 6px', borderRadius: 999 } : undefined}
    >
      {prefix}
      <span aria-hidden>{ARROW[dir]}</span>
      <span>
        {Math.abs(delta)}
        {suffix}
      </span>
    </span>
  )
}
