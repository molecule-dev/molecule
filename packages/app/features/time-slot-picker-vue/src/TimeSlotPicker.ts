/**
 * Vue time-slot picker: a radiogroup of selectable delivery / appointment
 * slots, each with a label and an optional meta line, in a list or a
 * fixed-column grid.
 *
 * Vue counterpart of `@molecule/app-time-slot-picker-react`'s
 * `TimeSlotPicker` — the same props (React names), the same DOM for the same
 * input, and the same `onSelect(slot)` calls.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { TimeSlot } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The title node, or undefined.
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
 * Picker for delivery / appointment / reservation time slots. Each slot
 * shows a label + optional secondary meta (date, fee, remaining
 * capacity). Disabled slots are dimmed and not clickable.
 *
 * Selection is conveyed by `aria-checked` plus a bolder label only; the
 * component keeps no state, so the caller persists the pick from `onSelect`.
 *
 * @param props - Component props (see {@link TimeSlotPickerProps}).
 * @returns The time-slot picker component.
 */
export const TimeSlotPicker = defineComponent({
  name: 'TimeSlotPicker',
  props: {
    slots: {
      type: Array as PropType<TimeSlot[]>,
      default: () => [],
    },
    selectedId: String,
    onSelect: {
      type: Function as PropType<(slot: TimeSlot) => void>,
      default: undefined,
    },
    layout: {
      type: String as PropType<'list' | 'grid'>,
      default: 'list',
    },
    columns: {
      type: Number as PropType<2 | 3 | 4>,
      default: 2,
    },
    // Node-valued (a VNode or text): `null` accepts any runtime type, the way
    // Vue declares a slot-ish prop.
    title: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const title = slotOrProp(slots.title, props.title)
      const titleNodes = toChildArray(title)
      // React reads the RESOLVED title: an emptied one is no string, so the
      // translated default names the group.
      const ariaTitle = titleNodes.length === 1 ? titleNodes[0] : undefined
      const ariaLabel =
        typeof ariaTitle === 'string'
          ? ariaTitle
          : t('timeSlot.aria', {}, { defaultValue: 'Time slots' })

      return h('div', { class: cm.cn(cm.stack(2), props.className) }, [
        titleNodes.length > 0
          ? h('h3', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, [title])
          : null,
        h(
          'div',
          {
            role: 'radiogroup',
            'aria-label': ariaLabel,
            class:
              props.layout === 'grid' ? cm.grid({ cols: props.columns, gap: 'sm' }) : cm.stack(2),
          },
          props.slots.map((slot) => {
            const selected = slot.id === props.selectedId
            return h(
              'button',
              {
                key: slot.id,
                type: 'button',
                role: 'radio',
                'aria-checked': selected ? 'true' : 'false',
                disabled: slot.disabled,
                onClick: () => {
                  if (!slot.disabled) props.onSelect?.(slot)
                },
                class: cm.cn(
                  cm.flex({ direction: 'col', align: 'start' }),
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                ),
                style: slot.disabled ? { opacity: 0.4 } : undefined,
              },
              [
                h('span', [slot.label]),
                slot.meta ? h('span', { class: cm.textSize('xs') }, [slot.meta]) : null,
              ],
            )
          }),
        ),
      ])
    }
  },
})
