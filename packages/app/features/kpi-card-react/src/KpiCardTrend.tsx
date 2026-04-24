import { getClassMap } from '@molecule/app-ui'

import type { KpiTrendDirection } from './KpiCard.js'

interface KpiCardTrendProps {
  /** Numeric delta to display (e.g. 12.3 for +12.3%). Sign drives direction when `direction` omitted. */
  delta: number
  /**
   * Explicit direction override. When omitted, derived from the sign of `delta`
   * (0 = flat, >0 = up, <0 = down).
   */
  direction?: KpiTrendDirection
  /** Suffix appended to the delta. Defaults to `'%'`. */
  suffix?: string
  /** Extra classes. */
  className?: string
}

/**
 * Tiny arrow + delta% rendered inside a `<KpiCard>`'s trend slot.
 * Color maps to the `direction` — semantic colors come from the ClassMap.
 * @param root0
 * @param root0.delta
 * @param root0.direction
 * @param root0.suffix
 * @param root0.className
 */
export function KpiCardTrend({ delta, direction, suffix = '%', className }: KpiCardTrendProps) {
  const cm = getClassMap()
  const dir: KpiTrendDirection = direction ?? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–'
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        className,
      )}
    >
      <span aria-hidden>{arrow}</span>
      <span>
        {Math.abs(delta)}
        {suffix}
      </span>
    </span>
  )
}
