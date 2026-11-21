import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Union of possible component health states. */
export type ComponentStatus =
  'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance'

/** A single monitored component with its current health status. */
export interface StatusComponent {
  id: string
  name: ReactNode
  status: ComponentStatus
  /** Optional sub-label (SLA %, region, etc.). */
  subtitle?: ReactNode
}

/** A named group of related StatusComponent entries. */
export interface StatusGroup {
  id: string
  name: ReactNode
  components: StatusComponent[]
}

/** Props for the {@link StatusSummary} component. */
export interface StatusSummaryProps {
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

/**
 * The semantic tone colouring each status: the theme's success green for
 * operational, its warning amber for degraded and partial outage, its error
 * red for a major outage and its info blue for maintenance.
 */
const STATUS_TONE: Record<ComponentStatus, ColorVariant> = {
  operational: 'success',
  degraded: 'warning',
  'partial-outage': 'warning',
  'major-outage': 'error',
  maintenance: 'info',
}

/**
 * Returns the most severe status from an array of ComponentStatus values.
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
 * @param props - Component props (see {@link StatusSummaryProps}).
 */
export function StatusSummary({
  groups,
  overallStatus,
  header,
  footer,
  className,
}: StatusSummaryProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  /**
   * The label for one status, through its literal i18n key with the English
   * fallback (the same text the `common` locale bond's en.ts ships).
   * @param status - The status to label.
   * @returns The translated label.
   */
  const statusLabel = (status: ComponentStatus): string => {
    switch (status) {
      case 'operational':
        return t('status.operational', {}, { defaultValue: 'Operational' })
      case 'degraded':
        return t('status.degraded', {}, { defaultValue: 'Degraded performance' })
      case 'partial-outage':
        return t('status.partial-outage', {}, { defaultValue: 'Partial outage' })
      case 'major-outage':
        return t('status.major-outage', {}, { defaultValue: 'Major outage' })
      case 'maintenance':
        return t('status.maintenance', {}, { defaultValue: 'Under maintenance' })
    }
  }

  const allStatuses = groups.flatMap((g) => g.components.map((c) => c.status))
  const overall = overallStatus ?? worst(allStatuses)
  return (
    <div className={cm.cn(cm.stack(4), className)}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('p', 3),
          cm.bgTone(STATUS_TONE[overall]),
          cm.textOnTone,
        )}
        style={{ borderRadius: 8 }}
      >
        <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {statusLabel(overall)}
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
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.bgTone(STATUS_TONE[c.status]),
                    cm.textOnTone,
                  )}
                  style={{ borderRadius: 4 }}
                >
                  {statusLabel(c.status)}
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
