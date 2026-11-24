import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { ChartCardProps } from './types.js'

/**
 * Uniform chrome around a chart rendering — header + actions + optional
 * summary strip + chart body + optional footer.
 *
 * The chart library itself comes from the `@molecule/app-charts` bond; this
 * package only provides the surrounding container.
 *
 * This is the Solid counterpart of `@molecule/app-chart-wrapper-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link ChartCardProps}).
 * @returns The rendered chart card.
 */
export const ChartCard: Component<ChartCardProps> = (props) => {
  const cm = getClassMap()
  const minHeight = (): number => props.minChartHeight ?? 240

  return (
    <Card className={props.className} data-mol-id={props.dataMolId}>
      <div class={cm.stack(4)}>
        <header class={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
          <div class={cm.stack(1)}>
            <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
            <PresentWhileNode node={props.description}>
              {(description) => <p class={cm.textSize('sm')}>{description()}</p>}
            </PresentWhileNode>
          </div>
          <PresentWhileNode node={props.actions}>
            {(actions) => <div class={cm.flex({ align: 'center', gap: 'sm' })}>{actions()}</div>}
          </PresentWhileNode>
        </header>
        <PresentWhileNode node={props.summary}>
          {(summary) => (
            <div class={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>{summary()}</div>
          )}
        </PresentWhileNode>
        <div style={{ 'min-height': `${minHeight()}px` }}>{props.children}</div>
        <PresentWhileNode node={props.footer}>{(footer) => <div>{footer()}</div>}</PresentWhileNode>
      </div>
    </Card>
  )
}
