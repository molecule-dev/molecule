/**
 * Vue Switch UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Switch UI component with UIClassMap-driven styling.
 */
export const Switch = defineComponent({
  name: 'MSwitch',
  props: {
    modelValue: Boolean,
    label: String,
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    color: String as PropType<ColorVariant>,
    disabled: Boolean,
    class: String,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const cm = getClassMap()

    return () => {
      const state = props.modelValue ? 'checked' : 'unchecked'

      return h(
        'label',
        {
          class: cm.cn(cm.controlLabel, props.disabled && cm.controlDisabled),
        },
        [
          h(
            'button',
            {
              type: 'button',
              role: 'switch',
              'aria-checked': props.modelValue,
              disabled: props.disabled,
              'data-state': state,
              class: cm.cn(cm.switchBase({ size: props.size }), props.class),
              onClick: () => {
                if (!props.disabled) {
                  emit('update:modelValue', !props.modelValue)
                }
              },
            },
            h('span', { 'data-state': state, class: cm.switchThumb({ size: props.size }) }),
          ),
          props.label && h('span', { class: cm.controlText }, props.label),
        ],
      )
    }
  },
})
