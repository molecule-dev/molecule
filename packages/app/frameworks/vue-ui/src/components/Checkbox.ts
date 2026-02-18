/**
 * Vue Checkbox UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, onMounted, type PropType, ref, watch } from 'vue'

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Checkbox UI component with UIClassMap-driven styling.
 */
export const Checkbox = defineComponent({
  name: 'MCheckbox',
  props: {
    modelValue: Boolean,
    label: String,
    indeterminate: Boolean,
    size: String as PropType<Size>,
    error: String,
    disabled: Boolean,
    name: String,
    id: String,
    class: String,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const cm = getClassMap()
    const inputRef = ref<HTMLInputElement | null>(null)

    watch(
      () => props.indeterminate,
      (value) => {
        if (inputRef.value) {
          inputRef.value.indeterminate = !!value
        }
      },
    )

    onMounted(() => {
      if (inputRef.value && props.indeterminate) {
        inputRef.value.indeterminate = true
      }
    })

    return () => {
      const checkboxId = props.id || props.name
      const checkboxClasses = cm.cn(cm.checkbox({ error: !!props.error }), props.class)

      const children: ReturnType<typeof h>[] = []

      // Checkbox and label wrapper
      children.push(
        h('label', { class: cm.controlLabel }, [
          h('input', {
            ref: inputRef,
            type: 'checkbox',
            id: checkboxId,
            name: props.name,
            checked: props.modelValue,
            disabled: props.disabled,
            'data-state': props.modelValue ? 'checked' : 'unchecked',
            'aria-invalid': !!props.error,
            class: checkboxClasses,
            onChange: (e: Event) =>
              emit('update:modelValue', (e.target as HTMLInputElement).checked),
          }),
          props.label &&
            h(
              'span',
              {
                class: cm.cn(cm.controlText, props.disabled && cm.controlDisabled),
              },
              props.label,
            ),
        ]),
      )

      // Error message
      if (props.error) {
        children.push(h('p', { class: cm.cn(cm.formError, cm.sp('mt', 1)) }, props.error))
      }

      return h('div', { class: cm.formFieldWrapper }, children)
    }
  },
})
