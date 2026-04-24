import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export type ComponentStatus =
  | 'operational'
  | 'degraded'
  | 'partial-outage'
  | 'major-outage'
  | 'maintenance'

/**
 *
 */
export interface StatusComponent {
  id: string
  name: ReactNode
  status: ComponentStatus
  /** Optional sub-label (SLA %, region, etc.). */
  subtitle?: ReactNode
}

/**
 *
 */
export interface StatusGroup {
  id: string
  name: ReactNode
  components: StatusComponent[]
}

interface StatusSummaryProps {
  /** Grouped components. */
  groups: StatusGroup[]
  /** Overall summary label (auto-derived if omitted). */
  overallStatus?: ComponentStatus
  /** Optional header content (last updated time, subscribe button). */
  header?: ReactNode
  /** Optional below-the-grid slot — typically a recent-incidents list. */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}

const STATUS_LABEL: Record<ComponentStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  'partial-outage': 'Partial outage',
  'major-outage': 'Major outage',
  maintenance: 'Under maintenance',
}
const STATUS_COLOR: Record<ComponentStatus, string> = {
  operational: '#22c55e',
  degraded: '#eab308',
  'partial-outage': '#f97316',
  'major-outage': '#ef4444',
  maintenance: '#60a5fa',
}

/**
 *
 * @param statuses
 */
function worst(statuses: ComponentStatus[]): ComponentStatus {
  const order: ComponentStatus[] = [
    'major-outage',
    'partial-outage',
    'degraded',
    'maintenance',
    'operational',
  ]
  for (const s of order) {
    if (statuses.includes(s)) return s
  }
  return 'operational'
}

/**
 * Status-page summary — grouped component list with colored badges and
 * an overall banner derived from the worst child status.
 * @param root0
 * @param root0.groups
 * @param root0.overallStatus
 * @param root0.header
 * @param root0.footer
 * @param root0.className
 */
export function StatusSummary({
  groups,
  overallStatus,
  header,
  footer,
  className,
}: StatusSummaryProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const allStatuses = groups.flatMap((g) => g.components.map((c) => c.status))
  const overall = overallStatus ?? worst(allStatuses)
  return (
    <div className={cm.cn(cm.stack(4), className)}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('p', 3),
        )}
        style={{ background: STATUS_COLOR[overall], color: '#fff', borderRadius: 8 }}
      >
        <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t(`status.${overall}`, {}, { defaultValue: STATUS_LABEL[overall] })}
        </span>
        {header}
      </div>
      {groups.map((g) => (
        <section key={g.id} className={cm.stack(2)}>
          <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{g.name}</h3>
          <ul className={cm.stack(1 as const)}>
            {g.components.map((c) => (
              <li
                key={c.id}
                className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
              >
                <div>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {c.name}
                  </span>
                  {c.subtitle && (
                    <span className={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}>{c.subtitle}</span>
                  )}
                </div>
                <span
                  className={cm.cn(cm.sp('px', 2), cm.textSize('xs'), cm.fontWeight('semibold'))}
                  style={{ borderRadius: 4, background: STATUS_COLOR[c.status], color: '#fff' }}
                >
                  {t(`status.${c.status}`, {}, { defaultValue: STATUS_LABEL[c.status] })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {footer}
    </div>
  )
}
