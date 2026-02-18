/**
 * Vue Progress UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Progress UI component with UIClassMap-driven styling.
 */
export const Progress = defineComponent({
  name: 'MProgress',
  props: {
    value: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      default: 100,
    },
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    color: {
      type: String as PropType<ColorVariant>,
      default: 'primary',
    },
    showValue: Boolean,
    label: String,
    indeterminate: Boolean,
    class: String,
  },
  setup(props) {
    const cm = getClassMap()

    return () => {
      const percentage = Math.min(Math.max((props.value / props.max) * 100, 0), 100)

      const children: ReturnType<typeof h>[] = []

      // Label and value
      if (props.label || props.showValue) {
        children.push(
          h('div', { class: cm.progressLabelContainer }, [
            props.label && h('span', { class: cm.progressLabelText }, props.label),
            props.showValue &&
              h('span', { class: cm.progressLabelText }, `${Math.round(percentage)}%`),
          ]),
        )
      }

      // Progress bar
      children.push(
        h(
          'div',
          {
            class: cm.cn(cm.progress(), cm.progressHeight(props.size)),
            role: 'progressbar',
            'aria-valuenow': props.indeterminate ? undefined : props.value,
            'aria-valuemin': 0,
            'aria-valuemax': props.max,
            'aria-label': props.label,
          },
          h('div', {
            class: cm.cn(
              cm.progressBar(),
              cm.progressColor(props.color),
              props.indeterminate && cm.progressIndeterminate,
            ),
            style: props.indeterminate
              ? undefined
              : { transform: `translateX(-${100 - percentage}%)` },
          }),
        ),
      )

      return h('div', { class: cm.cn(cm.progressWrapper, props.class) }, children)
    }
  },
})
