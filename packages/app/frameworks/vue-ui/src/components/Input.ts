/**
 * Vue Input UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { t } from '@molecule/app-i18n'
import type { InputType, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Vue Input UI component with UIClassMap-driven styling.
 */
export const Input = defineComponent({
  name: 'MInput',
  props: {
    type: {
      type: String as PropType<InputType>,
      default: 'text',
    },
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    modelValue: [String, Number],
    label: String,
    placeholder: String,
    error: String,
    hint: String,
    disabled: Boolean,
    required: Boolean,
    name: String,
    id: String,
    class: String,
    clearable: Boolean,
    clearLabel: String,
  },
  emits: ['update:modelValue', 'clear', 'focus', 'blur'],
  setup(props, { emit, slots }) {
    const cm = getClassMap()

    return () => {
      const inputId = props.id || props.name

      const inputClasses = cm.cn(
        cm.input({ error: !!props.error, size: props.size }),
        slots.leftElement ? cm.inputPadLeft : undefined,
        slots.rightElement || (props.clearable && props.modelValue) ? cm.inputPadRight : undefined,
        props.class,
      )

      const children: ReturnType<typeof h>[] = []

      // Label
      if (props.label) {
        children.push(
          h(
            'label',
            {
              for: inputId,
              class: cm.cn(cm.label({ required: !!props.required }), cm.labelBlock),
            },
            props.label,
          ),
        )
      }

      // Input wrapper
      const inputChildren: ReturnType<typeof h>[] = []

      // Left element slot
      if (slots.leftElement) {
        inputChildren.push(
          h(
            'div',
            {
              class: cm.inputLeftElement,
            },
            slots.leftElement(),
          ),
        )
      }

      // Input element
      inputChildren.push(
        h('input', {
          type: props.type,
          id: inputId,
          name: props.name,
          value: props.modelValue,
          placeholder: props.placeholder,
          disabled: props.disabled,
          required: props.required,
          'aria-invalid': !!props.error,
          'aria-describedby': props.error
            ? `${inputId}-error`
            : props.hint
              ? `${inputId}-hint`
              : undefined,
          class: inputClasses,
          onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
          onFocus: (e: FocusEvent) => emit('focus', e),
          onBlur: (e: FocusEvent) => emit('blur', e),
        }),
      )

      // Right element or clear button
      if (slots.rightElement || (props.clearable && props.modelValue)) {
        inputChildren.push(
          h(
            'div',
            { class: cm.inputRightElement },
            props.clearable && props.modelValue
              ? h(
                  'button',
                  {
                    type: 'button',
                    onClick: () => {
                      emit('update:modelValue', '')
                      emit('clear')
                    },
                    class: cm.inputClearButton,
                    'aria-label':
                      props.clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' }),
                  },
                  renderIcon('x-mark', cm.iconSm),
                )
              : slots.rightElement?.(),
          ),
        )
      }

      children.push(h('div', { class: cm.inputInner }, inputChildren))

      // Error message
      if (props.error) {
        children.push(h('p', { id: `${inputId}-error`, class: cm.formError }, props.error))
      }

      // Hint message
      if (props.hint && !props.error) {
        children.push(h('p', { id: `${inputId}-hint`, class: cm.formHint }, props.hint))
      }

      return h('div', { class: cm.inputWrapper }, children)
    }
  },
})
