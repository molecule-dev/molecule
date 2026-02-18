/**
 * Vue Textarea UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, onMounted, ref, watch } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Textarea UI component with UIClassMap-driven styling.
 */
export const Textarea = defineComponent({
  name: 'MTextarea',
  props: {
    modelValue: String,
    label: String,
    placeholder: String,
    error: String,
    hint: String,
    disabled: Boolean,
    required: Boolean,
    name: String,
    id: String,
    rows: Number,
    autoResize: Boolean,
    minRows: {
      type: Number,
      default: 3,
    },
    maxRows: Number,
    class: String,
  },
  emits: ['update:modelValue', 'focus', 'blur'],
  setup(props, { emit }) {
    const cm = getClassMap()
    const textareaRef = ref<HTMLTextAreaElement | null>(null)

    const autoResizeTextarea = (): void => {
      if (props.autoResize && textareaRef.value) {
        const element = textareaRef.value
        element.style.height = 'auto'
        const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20
        const minHeight = props.minRows * lineHeight
        const maxHeight = props.maxRows ? props.maxRows * lineHeight : Infinity
        const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
        element.style.height = `${newHeight}px`
      }
    }

    watch(() => props.modelValue, autoResizeTextarea)
    onMounted(autoResizeTextarea)

    return () => {
      const textareaId = props.id || props.name
      const textareaClasses = cm.cn(cm.textarea({ error: !!props.error }), props.class)

      const children: ReturnType<typeof h>[] = []

      // Label
      if (props.label) {
        children.push(
          h(
            'label',
            {
              for: textareaId,
              class: cm.cn(cm.label({ required: !!props.required }), cm.labelBlock),
            },
            props.label,
          ),
        )
      }

      // Textarea
      children.push(
        h('textarea', {
          ref: textareaRef,
          id: textareaId,
          name: props.name,
          value: props.modelValue,
          placeholder: props.placeholder,
          disabled: props.disabled,
          required: props.required,
          rows: props.rows || props.minRows,
          'aria-invalid': !!props.error,
          'aria-describedby': props.error
            ? `${textareaId}-error`
            : props.hint
              ? `${textareaId}-hint`
              : undefined,
          class: textareaClasses,
          onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLTextAreaElement).value),
          onFocus: (e: FocusEvent) => emit('focus', e),
          onBlur: (e: FocusEvent) => emit('blur', e),
        }),
      )

      // Error message
      if (props.error) {
        children.push(h('p', { id: `${textareaId}-error`, class: cm.formError }, props.error))
      }

      // Hint message
      if (props.hint && !props.error) {
        children.push(h('p', { id: `${textareaId}-hint`, class: cm.formHint }, props.hint))
      }

      return h('div', { class: cm.inputWrapper }, children)
    }
  },
})
