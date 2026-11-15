/**
 * Solid order / shipment progress timeline: placed → shipped → delivered
 * milestones with connector lines, colored status nodes and an optional ETA
 * line.
 *
 * Solid counterpart of `@molecule/app-order-timeline-react`'s `OrderTimeline` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { OrderMilestone, OrderTimelineProps } from './types.js'

/**
 * The status node's color: current wins over completed, and every other
 * milestone is pending.
 *
 * @param milestone - The milestone.
 * @returns The node color.
 */
const dotColor = (milestone: OrderMilestone): string =>
  milestone.current ? '#60a5fa' : milestone.completed ? '#22c55e' : '#d1d5db'

/**
 * The status node's inline style, exactly React's object (Solid writes CSS
 * property names in kebab case and does not add `px`, so the units are
 * spelled out). A property React omits is passed as `''`, which clears it:
 * Solid's own update path removes a dropped key with `removeProperty`, which
 * leaves a shorthand's longhands behind.
 *
 * @param milestone - The milestone.
 * @returns The style declarations.
 */
const dotStyle = (milestone: OrderMilestone): Record<string, string> => ({
  width: '14px',
  height: '14px',
  'border-radius': '50%',
  background: dotColor(milestone),
  border: milestone.current ? '3px solid currentColor' : '',
})

/**
 * The connector line's inline style, exactly React's object: horizontal lines
 * stretch between nodes, vertical ones run below the node (see
 * {@link dotStyle} for the `''` entries).
 *
 * @param milestone - The milestone the connector belongs to.
 * @param vertical - Whether the layout is vertical.
 * @returns The style declarations.
 */
const connectorStyle = (milestone: OrderMilestone, vertical: boolean): Record<string, string> => {
  const background = milestone.completed ? '#22c55e' : '#d1d5db'
  return vertical
    ? {
        height: '24px',
        width: '2px',
        background,
        display: 'inline-block',
        flex: '',
        'margin-left': '',
        'margin-right': '',
      }
    : {
        width: '100%',
        height: '2px',
        background,
        display: 'inline-block',
        flex: '1',
        'margin-left': '4px',
        'margin-right': '4px',
      }
}

/**
 * Order / shipment progress timeline — typical e-commerce flow:
 * "Placed → Confirmed → Shipped → Out for delivery → Delivered".
 *
 * Different from `<Stepper>` in two ways:
 * - Focuses on milestones (with optional per-step detail) rather than
 *   multi-page wizard steps.
 * - Horizontal layout is responsive with connector lines between nodes.
 *
 * React keys each row by the milestone's `id` value, so a re-ordered or
 * re-passed array moves/keeps the rendered rows per id. Solid's `For` keys by
 * reference, so the rows are keyed through stable per-id records: the record
 * for an id is created once and reused, while the row's content reads the
 * CURRENT milestone for that id reactively.
 *
 * @param props - Component props (see {@link OrderTimelineProps}).
 * @returns The rendered order timeline.
 */
export const OrderTimeline: Component<OrderTimelineProps> = (props) => {
  const cm = getClassMap()
  const vertical = (): boolean => (props.orientation ?? 'horizontal') === 'vertical'

  /** One stable record per milestone id, created on first sight. */
  interface Row {
    id: string
  }
  const rows = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const list = props.milestones.map((milestone) => {
      seen.add(milestone.id)
      let row = rows.get(milestone.id)
      if (!row) {
        row = { id: milestone.id }
        rows.set(milestone.id, row)
      }
      return row
    })
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id)
    return list
  }
  const milestoneFor = (id: string): OrderMilestone | undefined =>
    props.milestones.find((milestone) => milestone.id === id)

  return (
    <div class={cm.cn(cm.stack(3), props.className)}>
      <div class={vertical() ? cm.stack(2) : cm.flex({ align: 'start', gap: 'sm' })}>
        <For each={keyedRows()}>
          {(row, i) => {
            const milestone = (): OrderMilestone => milestoneFor(row.id) as OrderMilestone
            const isLast = (): boolean => i() === props.milestones.length - 1
            return (
              <div
                class={
                  vertical()
                    ? cm.flex({ align: 'start', gap: 'sm' })
                    : cm.cn(cm.stack(1), cm.flex1, cm.textCenter)
                }
              >
                <div class={cm.flex({ align: 'center', justify: 'center' })}>
                  <span aria-hidden="true" style={dotStyle(milestone())} />
                  <Show when={!isLast()}>
                    <span aria-hidden="true" style={connectorStyle(milestone(), vertical())} />
                  </Show>
                </div>
                <div class={cm.cn(cm.stack(0))}>
                  <span
                    class={cm.cn(
                      cm.textSize('sm'),
                      milestone().current ? cm.fontWeight('bold') : cm.fontWeight('medium'),
                    )}
                  >
                    {milestone().label}
                  </span>
                  <Show when={milestone().detail}>
                    <span class={cm.textSize('xs')}>{milestone().detail}</span>
                  </Show>
                </div>
              </div>
            )
          }}
        </For>
      </div>
      <Show when={props.eta}>
        <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.eta}</div>
      </Show>
    </div>
  )
}
