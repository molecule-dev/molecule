import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface TrendChipProps {
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
const COLOR = { up: '#22c55e', down: '#ef4444', flat: '#94a3b8' } as const

/**
 * Standalone trend delta chip — `▲ 12%` style display for inline
 * placement in row/header/cell contexts. Different from
 * `<KpiCardTrend>` in being usable outside of a KPI card.
 * @param root0
 * @param root0.delta
 * @param root0.direction
 * @param root0.suffix
 * @param root0.prefix
 * @param root0.variant
 * @param root0.ariaLabel
 * @param root0.className
 */
export function TrendChip({
  delta,
  direction,
  suffix = '%',
  prefix,
  variant = 'subtle',
  ariaLabel,
  className,
}: TrendChipProps) {
  const cm = getClassMap()
  const dir = direction ?? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')
  const color = COLOR[dir]
  return (
    <span
      aria-label={ariaLabel ?? `${prefix ?? ''}${ARROW[dir]} ${Math.abs(delta)}${suffix}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        className,
      )}
      style={
        variant === 'pill'
          ? { padding: '2px 6px', borderRadius: 999, background: color, color: '#fff' }
          : { color }
      }
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
