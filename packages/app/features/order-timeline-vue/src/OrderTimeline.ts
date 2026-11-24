/**
 * Vue order / shipment progress timeline: placed → shipped → delivered
 * milestones with connector lines, colored status nodes and an optional ETA
 * line.
 *
 * Vue counterpart of `@molecule/app-order-timeline-react`'s `OrderTimeline` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

import type { OrderMilestone } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The node to render, or undefined.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | undefined,
): VNodeChild | undefined => {
  if (slot) {
    const nodes = slot()
    return nodes.length === 1 ? nodes[0] : nodes
  }
  return prop
}

/**
 * The status node's class: current wins over completed (its semantic tone),
 * and every other milestone is de-emphasis chrome — the theme's border colour
 * rather than a status tone.
 *
 * @param cm - The class map.
 * @param milestone - The milestone.
 * @returns The node's class.
 */
const dotClass = (cm: UIClassMap, milestone: OrderMilestone): string =>
  cm.cn(
    milestone.current
      ? cm.bgTone('info')
      : milestone.completed
        ? cm.bgTone('success')
        : cm.bgBorder,
  )

/**
 * The status node's inline style, exactly React's object: sizing only — the
 * fill colour is a ClassMap tone class (see {@link dotClass}).
 *
 * @param milestone - The milestone.
 * @returns The style declarations (React's camelCase keys).
 */
const dotStyle = (milestone: OrderMilestone): Record<string, string | undefined> => ({
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  border: milestone.current ? '3px solid currentColor' : undefined,
})

/**
 * The connector line's class: a completed leg takes the success tone; an
 * un-reached one is de-emphasis chrome in the theme's border colour.
 *
 * @param cm - The class map.
 * @param milestone - The milestone the connector belongs to.
 * @returns The connector's class.
 */
const connectorClass = (cm: UIClassMap, milestone: OrderMilestone): string =>
  cm.cn(milestone.completed ? cm.bgTone('success') : cm.bgBorder)

/**
 * The connector line's inline style, exactly React's object: horizontal lines
 * stretch between nodes, vertical ones run below the node — sizing and flow
 * only, the fill colour is a ClassMap class (see {@link connectorClass}).
 *
 * @param vertical - Whether the layout is vertical.
 * @returns The style declarations (React's camelCase keys).
 */
const connectorStyle = (vertical: boolean): Record<string, string | number | undefined> =>
  vertical
    ? { height: '24px', width: '2px', display: 'inline-block' }
    : {
        width: '100%',
        height: '2px',
        display: 'inline-block',
        flex: 1,
        marginLeft: '4px',
        marginRight: '4px',
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
 * @param props - Component props (see {@link OrderTimelineProps}).
 * @returns The order timeline component.
 */
export const OrderTimeline = defineComponent({
  name: 'OrderTimeline',
  props: {
    milestones: {
      type: Array as PropType<OrderMilestone[]>,
      required: true,
    },
    // Node-valued (a VNode or text): `null` accepts any runtime type, the way
    // Vue declares a slot-ish prop.
    eta: null,
    orientation: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    /** One milestone's row: status node, connector (except the last) and text. */
    const item = (milestone: OrderMilestone, index: number, vertical: boolean): VNode => {
      const isLast = index === props.milestones.length - 1
      return h(
        'div',
        {
          key: milestone.id,
          class: vertical
            ? cm.flex({ align: 'start', gap: 'sm' })
            : cm.cn(cm.stack(1), cm.flex1, cm.textCenter),
        },
        [
          h('div', { class: cm.flex({ align: 'center', justify: 'center' }) }, [
            h('span', {
              'aria-hidden': 'true',
              class: dotClass(cm, milestone),
              style: dotStyle(milestone),
            }),
            isLast
              ? null
              : h('span', {
                  'aria-hidden': 'true',
                  class: connectorClass(cm, milestone),
                  style: connectorStyle(vertical),
                }),
          ]),
          h('div', { class: cm.cn(cm.stack(0)) }, [
            h(
              'span',
              {
                class: cm.cn(
                  cm.textSize('sm'),
                  milestone.current ? cm.fontWeight('bold') : cm.fontWeight('medium'),
                ),
              },
              [milestone.label],
            ),
            milestone.detail ? h('span', { class: cm.textSize('xs') }, [milestone.detail]) : null,
          ]),
        ],
      )
    }

    return (): VNode => {
      const vertical = props.orientation === 'vertical'
      const eta = slotOrProp(slots.eta, props.eta)
      return h('div', { class: cm.cn(cm.stack(3), props.className) }, [
        h(
          'div',
          {
            class: vertical ? cm.stack(2) : cm.flex({ align: 'start', gap: 'sm' }),
          },
          props.milestones.map((milestone, index) => item(milestone, index, vertical)),
        ),
        toChildArray(eta).length > 0
          ? h('div', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, [eta])
          : null,
      ])
    }
  },
})
