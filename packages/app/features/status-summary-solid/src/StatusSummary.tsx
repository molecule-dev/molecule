/**
 * Solid status-page summary: grouped component list with colored badges and an
 * overall banner derived from the worst child status.
 *
 * Solid counterpart of `@molecule/app-status-summary-react`'s `StatusSummary` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ComponentStatus, StatusSummaryProps } from './types.js'

/** English label rendered for each status when no locale bond supplies the key. */
const STATUS_LABEL: Record<ComponentStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  'partial-outage': 'Partial outage',
  'major-outage': 'Major outage',
  maintenance: 'Under maintenance',
}

/** The fixed semantic hue of each status (React's inline-style palette). */
const STATUS_COLOR: Record<ComponentStatus, string> = {
  operational: '#22c55e',
  degraded: '#eab308',
  'partial-outage': '#f97316',
  'major-outage': '#ef4444',
  maintenance: '#60a5fa',
}

/** The statuses from most to least severe (React's `worst` order). */
const SEVERITY_ORDER: ComponentStatus[] = [
  'major-outage',
  'partial-outage',
  'degraded',
  'maintenance',
  'operational',
]

/**
 * Returns the most severe status from an array of ComponentStatus values.
 *
 * @param statuses - Every component status in the summary.
 * @returns The worst status found, or `'operational'` for an empty list.
 */
function worst(statuses: ComponentStatus[]): ComponentStatus {
  for (const status of SEVERITY_ORDER) {
    if (statuses.includes(status)) return status
  }
  return 'operational'
}

/**
 * Status-page summary — grouped component list with colored badges and an
 * overall banner derived from the worst child status.
 *
 * When `overallStatus` is omitted the banner shows the worst status found
 * across all components (major-outage > partial-outage > degraded >
 * maintenance > operational). The banner renders `header`, the grid renders
 * one section per group and `footer` renders below it.
 *
 * @param props - Component props (see {@link StatusSummaryProps}).
 * @returns The rendered status summary.
 */
export const StatusSummary: Component<StatusSummaryProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** Every component status in the summary, in render order. */
  const allStatuses = (): ComponentStatus[] =>
    props.groups.flatMap((group) => group.components.map((component) => component.status))

  /** The banner's status: React's `overallStatus ?? worst(allStatuses)`. */
  const overall = (): ComponentStatus => props.overallStatus ?? worst(allStatuses())

  /** The banner's inline style, in React's declaration order. */
  const bannerStyle = (): JSX.CSSProperties => ({
    background: STATUS_COLOR[overall()],
    color: '#fff',
    'border-radius': '8px',
  })

  /** One badge's inline style, in React's declaration order. */
  const badgeStyle = (status: ComponentStatus): JSX.CSSProperties => ({
    'border-radius': '4px',
    background: STATUS_COLOR[status],
    color: '#fff',
  })

  return (
    <div class={cm.cn(cm.stack(4), props.className)}>
      <div
        class={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), cm.sp('p', 3))}
        style={bannerStyle()}
      >
        <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t(`status.${overall()}`, {}, { defaultValue: STATUS_LABEL[overall()] })}
        </span>
        {props.header}
      </div>
      {props.groups.map((group) => (
        <section class={cm.stack(2)}>
          <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{group.name}</h3>
          <ul class={cm.stack(1)}>
            {group.components.map((component) => (
              <li class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <div>
                  <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {component.name}
                  </span>
                  {component.subtitle ? (
                    <span class={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}>
                      {component.subtitle}
                    </span>
                  ) : undefined}
                </div>
                <span
                  class={cm.cn(cm.sp('px', 2), cm.textSize('xs'), cm.fontWeight('semibold'))}
                  style={badgeStyle(component.status)}
                >
                  {t(
                    `status.${component.status}`,
                    {},
                    {
                      defaultValue: STATUS_LABEL[component.status],
                    },
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {props.footer}
    </div>
  )
}
