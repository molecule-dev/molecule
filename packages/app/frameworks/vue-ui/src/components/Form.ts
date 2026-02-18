/**
 * Form components.
 *
 * @module
 */

import { defineComponent, h, type PropType } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Form UI component with UIClassMap-driven styling.
 */
export const Form = defineComponent({
  name: 'MForm',
  props: {
    action: String,
    method: String as PropType<'get' | 'post'>,
    noValidate: Boolean,
    submitting: Boolean,
    class: String,
  },
  emits: ['submit', 'formSubmit'],
  setup(props, { emit, slots }) {
    const handleSubmit = (e: Event): void => {
      emit('submit', e)

      const form = e.target as HTMLFormElement
      const formData = new FormData(form)
      const data: Record<string, unknown> = {}
      formData.forEach((value, key) => {
        data[key] = value
      })
      emit('formSubmit', data)
    }

    return () =>
      h(
        'form',
        {
          class: props.class,
          action: props.action,
          method: props.method,
          novalidate: props.noValidate,
          onSubmit: handleSubmit,
        },
        h(
          'fieldset',
          {
            disabled: props.submitting,
            class: getClassMap().formFieldsetContents,
          },
          slots.default?.(),
        ),
      )
  },
})

/**
 * FormField component.
 */
export const FormField = defineComponent({
  name: 'MFormField',
  props: {
    label: String,
    name: String,
    error: String,
    hint: String,
    required: Boolean,
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return () => {
      const children: ReturnType<typeof h>[] = []

      // Label
      if (props.label) {
        children.push(
          h(
            'label',
            {
              for: props.name,
              class: cm.cn(cm.label({ required: !!props.required }), cm.labelBlock),
            },
            props.label,
          ),
        )
      }

      // Slot content (input, select, etc.)
      children.push(...(slots.default?.() ?? []))

      // Error message
      if (props.error) {
        children.push(h('p', { id: `${props.name}-error`, class: cm.formError }, props.error))
      }

      // Hint message
      if (props.hint && !props.error) {
        children.push(h('p', { id: `${props.name}-hint`, class: cm.formHint }, props.hint))
      }

      return h('div', { class: cm.cn(cm.w('full'), cm.sp('mb', 4), props.class) }, children)
    }
  },
})

/**
 * Vue Label component for form fields, with optional required indicator.
 */
export const Label = defineComponent({
  name: 'MLabel',
  props: {
    for: String,
    required: Boolean,
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return () =>
      h(
        'label',
        {
          for: props.for,
          class: cm.cn(cm.label({ required: !!props.required }), props.class),
        },
        slots.default?.(),
      )
  },
})
