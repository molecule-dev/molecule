/**
 * RadioGroup component.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { RadioOption, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * RadioGroup component.
 */
export const RadioGroup = defineComponent({
  name: 'MRadioGroup',
  props: {
    modelValue: String,
    options: {
      type: Array as PropType<RadioOption<string>[]>,
      required: true,
    },
    size: String as PropType<Size>,
    label: String,
    direction: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'vertical',
    },
    error: String,
    disabled: Boolean,
    class: String,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const cm = getClassMap()

    return () => {
      const children: ReturnType<typeof h>[] = []

      // Group label
      if (props.label) {
        children.push(h('div', { class: cm.cn(cm.label({}), cm.radioGroupLabel) }, props.label))
      }

      // Radio options
      const radioOptions = props.options.map((option) => {
        const isChecked = props.modelValue === option.value
        const isDisabled = props.disabled || option.disabled

        return h(
          'label',
          {
            class: cm.cn(cm.controlLabel, isDisabled && cm.controlDisabled),
          },
          [
            h('input', {
              type: 'radio',
              name: props.label,
              value: option.value,
              checked: isChecked,
              disabled: isDisabled,
              'data-state': isChecked ? 'checked' : 'unchecked',
              class: cm.cn(cm.radio({ error: !!props.error }), cm.cursorPointer),
              onChange: () => emit('update:modelValue', option.value),
            }),
            h('span', { class: cm.controlText }, String(option.label)),
          ],
        )
      })

      children.push(
        h(
          'div',
          {
            class: cm.radioGroupLayout(props.direction),
          },
          radioOptions,
        ),
      )

      // Error message
      if (props.error) {
        children.push(h('p', { class: cm.cn(cm.formError, cm.sp('mt', 1)) }, props.error))
      }

      return h(
        'div',
        {
          class: props.class,
          role: 'radiogroup',
          'aria-label': props.label,
        },
        children,
      )
    }
  },
})
