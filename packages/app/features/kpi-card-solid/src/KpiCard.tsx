/**
 * Solid single KPI / metric display card — the counterpart of
 * `@molecule/app-kpi-card-react`'s `KpiCard`: the same props (React names), the
 * same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { KpiCardProps } from './types.js'

/**
 * Single KPI / metric display card.
 *
 * Layout: `[icon? title  action?] [value] [trend? / subtitle?]`.
 * Apps use this for dashboard metrics, report summaries, and admin
 * overviews.
 *
 * @param props - Component props (see {@link KpiCardProps}).
 * @returns The rendered KPI card.
 */
export const KpiCard: Component<KpiCardProps> = (props) => {
  const cm = getClassMap()
  const accentSide = (): string => props.accentSide ?? 'none'
  const accent = (): string => props.accentColor ?? cm.kpiCardAccentColor
  const accentClass = (): string =>
    accentSide() === 'left'
      ? cm.cn(cm.kpiCardAccentLeft, accent())
      : accentSide() === 'top'
        ? cm.cn(cm.kpiCardAccentTop, accent())
        : ''
  const liftClass = (): string => (props.hoverLift ? cm.kpiCardHoverLift : '')
  const titleClasses = (): string =>
    props.upperLabel
      ? cm.cn(cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.kpiCardTitleUppercase))
      : cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))
  const valueClasses = (): string =>
    cm.cn(
      cm.textSize('3xl'),
      props.emphasizeValue ? cm.fontWeight('extrabold') : cm.fontWeight('bold'),
    )
  return (
    <Card
      className={cm.cn(accentClass(), liftClass(), props.className)}
      data-mol-id={props.dataMolId}
    >
      <div class={cm.stack(3)}>
        <div class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            {props.icon}
            <span class={titleClasses()}>{props.title}</span>
          </div>
          {props.action}
        </div>
        <div class={valueClasses()}>{props.value}</div>
        <ResolveNode node={props.trend}>
          {(trend, hasTrend) => (
            <ResolveNode node={props.subtitle}>
              {(subtitle, hasSubtitle) => (
                <Show when={hasTrend() || hasSubtitle()}>
                  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
                    {trend()}
                    <Show when={hasSubtitle()}>
                      <span class={cm.textSize('sm')}>{subtitle()}</span>
                    </Show>
                  </div>
                </Show>
              )}
            </ResolveNode>
          )}
        </ResolveNode>
      </div>
    </Card>
  )
}
