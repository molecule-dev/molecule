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
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ComponentStatus, StatusSummaryProps } from './types.js'

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

  /**
   * The label for one status, through its literal i18n key with the English
   * fallback (the same text the `common` locale bond's en.ts ships).
   *
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

  /** Every component status in the summary, in render order. */
  const allStatuses = (): ComponentStatus[] =>
    props.groups.flatMap((group) => group.components.map((component) => component.status))

  /** The banner's status: React's `overallStatus ?? worst(allStatuses)`. */
  const overall = (): ComponentStatus => props.overallStatus ?? worst(allStatuses())

  /** The banner's rounded corners, in React's declaration order. */
  const bannerStyle: JSX.CSSProperties = { 'border-radius': '8px' }

  /** One badge's rounded corners, in React's declaration order. */
  const badgeStyle: JSX.CSSProperties = { 'border-radius': '4px' }

  return (
    <div class={cm.cn(cm.stack(4), props.className)}>
      <div
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('p', 3),
          cm.bgTone(STATUS_TONE[overall()]),
          cm.textOnTone,
        )}
        style={bannerStyle}
      >
        <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {statusLabel(overall())}
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
                  class={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.bgTone(STATUS_TONE[component.status]),
                    cm.textOnTone,
                  )}
                  style={badgeStyle}
                >
                  {statusLabel(component.status)}
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
