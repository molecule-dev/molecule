/**
 * Vue `Countdown` component: the counterpart of
 * `@molecule/app-countdown-react`'s `Countdown` — the same props (React names),
 * the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { formatDisplay } from './state.js'
import type { CountdownProps, CountdownState } from './types.js'
import { useCountdown } from './useCountdown.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Live countdown display with three default formats:
 * - `'compact'` — `3d 4h 12m 5s` (skips zero leading units)
 * - `'long'` — `3 days 4 hours 12 minutes 5 seconds`
 * - `'colon'` — `03:04:12:05`
 *
 * Pass `render` for full control over markup. Once the target has passed and
 * an `expired` node was given, that node renders instead of the display.
 *
 * @param props - Component props (see {@link CountdownProps}).
 * @returns The rendered countdown.
 */
export const Countdown = defineComponent({
  name: 'Countdown',
  props: {
    target: {
      type: [Date, String, Number] as PropType<Date | string | number>,
      required: true,
    },
    format: {
      type: String as PropType<'compact' | 'long' | 'colon'>,
      default: 'compact',
    },
    render: Function as PropType<CountdownProps['render']>,
    expired: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const state = useCountdown(() => props.target)

    return (): VNodeChild => {
      const current: CountdownState = {
        days: state.days.value,
        hours: state.hours.value,
        minutes: state.minutes.value,
        seconds: state.seconds.value,
        msRemaining: state.msRemaining.value,
        expired: state.expired.value,
      }
      const expiredNode = slotOrProp(slots.expired, props.expired)
      if (current.expired && (slots.expired !== undefined || props.expired != null))
        return expiredNode.length === 1 ? expiredNode[0] : expiredNode
      if (props.render) {
        const rendered = props.render(current)
        return h(
          'span',
          { class: props.className },
          Array.isArray(rendered) ? rendered : [rendered],
        )
      }
      return h(
        'span',
        { class: cm.cn(props.className) },
        formatDisplay(props.format, current.days, current.hours, current.minutes, current.seconds),
      ) as VNode
    }
  },
})
