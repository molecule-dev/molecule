/**
 * Vue RadioGroup UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { RadioGroupProps, RadioOption, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, styleOf } from '../utilities/attrs.js'

/** Source of the generated per-instance group names. */
let nextGeneratedName = 1

/**
 * Vue RadioGroup UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s RadioGroup: a `role="radiogroup"`
 * root, an optional group label, one label + radio pair per option, and an
 * error line. Every input renders `checked`, so the group is always a
 * React-style controlled field: after a user change, each radio is restored to
 * the rendered `value` prop until a re-render moves it.
 */
export const RadioGroup = defineComponent({
  name: 'MRadioGroup',
  inheritAttrs: false,
  props: {
    options: {
      type: Array as PropType<RadioOption<string>[]>,
      required: true,
    },
    value: String,
    /** Accepted for React parity; the React port also ignores it. */
    size: String as PropType<Size>,
    label: String,
    name: String,
    direction: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'vertical',
    },
    error: String,
    disabled: {
      type: Boolean,
      default: false,
    },
    className: String,
    style: [String, Object] as PropType<RadioGroupProps['style']>,
    testId: String,
  },
  emits: ['change'],
  setup(props, { attrs, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // Radios only form a native group (arrow-key navigation, exclusive native
    // checked state) when they share a `name` — and that name must be UNIQUE
    // per group. The visible `label` is deliberately NOT used as the name:
    // two groups sharing a label (e.g. two "Size" pickers) would otherwise
    // form ONE native group and deselect each other. Callers that need a
    // specific submitted field name pass the `name` prop.
    const groupName = props.name || `mol-radio-${nextGeneratedName++}`
    const errorId = `${groupName}-error`

    const handleChange = (optionValue: string, event: Event): void => {
      emit('change', optionValue)
      // React restores every radio of the group to the rendered `value` prop
      // right after the change event (controlled `checked`): the selection
      // only moves when a re-render moves the prop. Without this, the
      // browser's own selection (the clicked radio) would stay checked.
      const radios = (event.target as HTMLInputElement | null)
        ?.closest('[role="radiogroup"]')
        ?.querySelectorAll<HTMLInputElement>('input[type="radio"]')
      if (radios) {
        for (const radio of radios) {
          radio.checked = radio.value === props.value
        }
      }
    }

    return () => {
      const children: VNodeChild[] = []

      // Group label
      if (props.label) {
        children.push(
          h('div', { class: cm.cn(cm.label({ required: false }), cm.sp('mb', 2)) }, props.label),
        )
      }

      // Radio options
      const radioOptions = props.options.map((option) => {
        const isChecked = props.value === option.value
        const isDisabled = props.disabled || option.disabled

        return h(
          'label',
          {
            key: option.value,
            class: cm.cn(cm.controlLabel, isDisabled && cm.controlDisabled),
          },
          [
            h('input', {
              type: 'radio',
              name: groupName,
              value: option.value,
              checked: isChecked,
              disabled: isDisabled,
              onChange: (event: Event) => handleChange(option.value, event),
              'data-state': isChecked ? 'checked' : 'unchecked',
              class: cm.cn(cm.radio({ error: !!props.error }), cm.cursorPointer),
            }),
            h('span', { class: cm.controlText }, option.label as string | VNode),
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
        children.push(
          h('p', { id: errorId, class: cm.cn(cm.formError, cm.sp('mt', 1)) }, props.error),
        )
      }

      return h(
        'div',
        {
          class: classOf(props.className, attrs),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          role: 'radiogroup',
          'aria-label':
            props.label ?? t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' }),
          'aria-invalid': props.error ? true : undefined,
          'aria-describedby': props.error ? errorId : undefined,
        },
        children,
      )
    }
  },
})
