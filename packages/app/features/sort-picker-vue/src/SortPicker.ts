/**
 * Vue sort-by picker: a single-select sort menu with a conventional label.
 *
 * The Vue counterpart of `@molecule/app-sort-picker-react`'s `SortPicker` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Select } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { SortOption } from './types.js'

/**
 * Standalone sort-by selector. Thin wrapper around `<Select>` with a
 * conventional "Sort by:" label and a focused single-select API.
 *
 * @param props - Component props (see `SortPickerProps`).
 * @returns The sort picker component.
 */
export const SortPicker = defineComponent({
  name: 'SortPicker',
  props: {
    value: {
      type: String,
      required: true,
    },
    options: {
      type: Array as PropType<SortOption[]>,
      required: true,
    },
    label: null,
    ariaLabel: String,
    labelPosition: {
      type: String as PropType<'inline' | 'above'>,
      default: 'inline',
    },
    className: String,
  },
  emits: ['change'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const defaultLabel = t('sort.label', {}, { defaultValue: 'Sort by' })
      // A node-valued label arrives as a prop AND as the same-named slot; the
      // slot wins. An absent pair falls back to the translated default.
      const slotted = slots.label?.()
      const labelValue =
        slotted && slotted.length > 0
          ? slotted.length === 1
            ? slotted[0]
            : slotted
          : (props.label as VNodeChild)
      const labelNode: VNodeChild = labelValue ?? defaultLabel
      // A node can never be an aria-label attribute value, so resolve a plain
      // string: an explicit `ariaLabel`, else the label when it is a string,
      // else the translated default.
      const selectAriaLabel =
        props.ariaLabel ?? (typeof labelNode === 'string' ? labelNode : defaultLabel)

      const select = h(Select, {
        value: props.value,
        options: props.options,
        'aria-label': selectAriaLabel,
        onValueChange: (value: string) => emit('change', value),
      })

      if (props.labelPosition === 'above') {
        return h('div', { class: cm.cn(cm.stack(1), props.className) }, [
          h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, labelNode),
          select,
        ])
      }
      return h('div', { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className) }, [
        h('span', { class: cm.textSize('sm') }, [labelNode, ':']),
        select,
      ])
    }
  },
})
