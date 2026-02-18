/**
 * Vue Select UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { getIconDataUrl } from '@molecule/app-icons'
import type { SelectOption, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Select UI component with UIClassMap-driven styling.
 */
export const Select = defineComponent({
  name: 'MSelect',
  props: {
    modelValue: String,
    options: {
      type: Array as PropType<SelectOption<string>[]>,
      required: true,
    },
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    label: String,
    placeholder: String,
    error: String,
    hint: String,
    disabled: Boolean,
    required: Boolean,
    clearable: Boolean,
    name: String,
    id: String,
    class: String,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const cm = getClassMap()

    return () => {
      const selectId = props.id || props.name

      const selectClasses = cm.cn(
        cm.select({ error: !!props.error, size: props.size }),
        cm.selectNative,
        props.class,
      )

      // Group options
      const groupedOptions = props.options.reduce<Record<string, SelectOption<string>[]>>(
        (acc, option) => {
          const group = option.group || ''
          if (!acc[group]) {
            acc[group] = []
          }
          acc[group].push(option)
          return acc
        },
        {},
      )

      const children: ReturnType<typeof h>[] = []

      // Label
      if (props.label) {
        children.push(
          h(
            'label',
            {
              for: selectId,
              class: cm.cn(cm.label({ required: !!props.required }), cm.labelBlock),
            },
            props.label,
          ),
        )
      }

      // Select options
      const selectOptions: ReturnType<typeof h>[] = []

      if (props.placeholder) {
        selectOptions.push(h('option', { value: '', disabled: true }, props.placeholder))
      }

      if (props.clearable) {
        selectOptions.push(h('option', { value: '' }, '--'))
      }

      const groups = Object.entries(groupedOptions)
      if (groups.length === 1 && groups[0][0] === '') {
        // No groups
        groups[0][1].forEach((option) => {
          selectOptions.push(
            h('option', { value: option.value, disabled: option.disabled }, option.label),
          )
        })
      } else {
        // With groups
        groups.forEach(([group, options]) => {
          if (group === '') {
            options.forEach((option) => {
              selectOptions.push(
                h('option', { value: option.value, disabled: option.disabled }, option.label),
              )
            })
          } else {
            selectOptions.push(
              h(
                'optgroup',
                { label: group },
                options.map((option) =>
                  h('option', { value: option.value, disabled: option.disabled }, option.label),
                ),
              ),
            )
          }
        })
      }

      // Select wrapper
      children.push(
        h(
          'div',
          { class: cm.inputInner },
          h(
            'select',
            {
              id: selectId,
              name: props.name,
              value: props.modelValue,
              disabled: props.disabled,
              required: props.required,
              'aria-invalid': !!props.error,
              'aria-describedby': props.error
                ? `${selectId}-error`
                : props.hint
                  ? `${selectId}-hint`
                  : undefined,
              class: selectClasses,
              style: {
                backgroundImage: getIconDataUrl('chevron-down', '#6b7280'),
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em',
              },
              onChange: (e: Event) =>
                emit('update:modelValue', (e.target as HTMLSelectElement).value),
            },
            selectOptions,
          ),
        ),
      )

      // Error message
      if (props.error) {
        children.push(h('p', { id: `${selectId}-error`, class: cm.formError }, props.error))
      }

      // Hint message
      if (props.hint && !props.error) {
        children.push(h('p', { id: `${selectId}-hint`, class: cm.formHint }, props.hint))
      }

      return h('div', { class: cm.inputWrapper }, children)
    }
  },
})
