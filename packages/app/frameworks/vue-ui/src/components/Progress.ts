/**
 * Vue Progress UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import type { BaseProps, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, styleOf } from '../utilities/attrs.js'

/**
 * Props for the Progress component.
 */
export interface ProgressProps extends BaseProps {
  /**
   * Progress value (0-100).
   */
  value: number

  /**
   * Maximum value.
   */
  max?: number

  /**
   * Progress size.
   */
  size?: Size

  /**
   * Progress color.
   */
  color?: ColorVariant

  /**
   * Whether to show the value label.
   */
  showValue?: boolean

  /**
   * Accessible label.
   */
  label?: string

  /**
   * Whether the progress is indeterminate.
   */
  indeterminate?: boolean
}

/**
 * Vue Progress UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Progress: a `role="progressbar"`
 * track styled by `cm.progress()` + `cm.progressHeight(size)` with the bar's
 * offset driven by the clamped percentage, an optional label/value row, and
 * the indeterminate animation class.
 */
export const Progress = defineComponent({
  name: 'MProgress',
  inheritAttrs: false,
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
    className: String,
    style: [String, Object] as PropType<BaseProps['style']>,
    testId: String,
  },
  setup(props, { attrs }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return () => {
      const percentage = Math.min(Math.max((props.value / props.max) * 100, 0), 100)

      const children: ReturnType<typeof h>[] = []

      if (props.label || props.showValue) {
        const labelChildren: ReturnType<typeof h>[] = []
        if (props.label) {
          labelChildren.push(h('span', { class: cm.progressLabelText }, props.label))
        }
        if (props.showValue) {
          // Two children, like React's `{Math.round(percentage)}%`.
          labelChildren.push(
            h('span', { class: cm.progressLabelText }, [Math.round(percentage), '%']),
          )
        }
        children.push(h('div', { class: cm.progressLabelContainer }, labelChildren))
      }

      children.push(
        h(
          'div',
          {
            class: cm.cn(cm.progress(), cm.progressHeight(props.size)),
            role: 'progressbar',
            // Clamp like the visual bar does — aria-valuenow outside
            // [valuemin, valuemax] is invalid ARIA and screen readers may
            // announce nonsense percentages (e.g. value=150 of max=100).
            'aria-valuenow': props.indeterminate
              ? undefined
              : Math.min(Math.max(props.value, 0), props.max),
            'aria-valuemin': 0,
            'aria-valuemax': props.max,
            'aria-label':
              props.label ?? t('ui.progress.label', undefined, { defaultValue: 'Progress' }),
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

      return h(
        'div',
        {
          class: cm.cn(cm.progressWrapper, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
        },
        children,
      )
    }
  },
})
