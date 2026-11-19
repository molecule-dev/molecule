/**
 * Vue Checkbox UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, onMounted, type PropType, type VNodeChild, watch } from 'vue'

import type { CheckboxProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { mountChecked, updateChecked } from '../utilities/checked.js'
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'

/** Counter backing the generated ids that stand in for React's `useId()`. */
let nextGeneratedId = 0

/**
 * Vue Checkbox UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Checkbox: a native checkbox
 * inside a `<label>` (with the label text in a `controlText` span), `onChange`
 * fired with the native click event that toggles it (React fires its change
 * during the click), a controlled `checked` restored to the prop right after
 * the handler runs, the DOM `indeterminate` flag synced from the prop, and an
 * error message wired to the input through `aria-describedby`.
 */
export const Checkbox = defineComponent({
  name: 'MCheckbox',
  inheritAttrs: false,
  props: {
    label: null,
    checked: {
      type: Boolean,
      default: undefined,
    },
    indeterminate: {
      type: Boolean,
      default: undefined,
    },
    size: String as PropType<CheckboxProps['size']>,
    error: String,
    className: String,
    style: [String, Object] as PropType<CheckboxProps['style']>,
    testId: String,
    disabled: {
      type: Boolean,
      default: false,
    },
    name: String,
    id: String,
  },
  emits: ['change', 'click'],
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    // Allocated once per instance, like React's `useId()`; it only backs
    // `errorId` when neither `id` nor `name` is given.
    const generatedId = `mol-checkbox-${nextGeneratedId++}`
    // The native input is React's `forwardRef` target; it also tracks the
    // node for the indeterminate DOM flag.
    const element = useElementRef<HTMLInputElement>(expose)

    // React's controlled `checked`: the attribute is written when the input
    // is created, the property on every commit (see `mountChecked`).
    // Uncontrolled inputs (no `checked` prop) are left alone, so
    // `defaultChecked` still applies.
    onMounted(() => {
      if (element.value) {
        mountChecked(element.value, props.checked)
        element.value.indeterminate = !!props.indeterminate
      }
    })
    watch(
      () => props.checked,
      () => {
        if (element.value) updateChecked(element.value, props.checked)
      },
    )
    watch(
      () => props.indeterminate,
      () => {
        if (element.value) {
          element.value.indeterminate = !!props.indeterminate
        }
      },
    )

    return () => {
      const checkboxId = props.id || props.name
      // The error message must be programmatically associated with the input
      // (like Input/Textarea/Select already do) — a bare sibling <p> is never
      // announced by screen readers, so the failure reason was invisible.
      const errorId = `${checkboxId || generatedId}-error`
      // The label is node-valued (React: `{label as React.ReactNode}`); the
      // prop arrives as a VNode, or as the same-named slot.
      const label = (props.label ?? slots.label?.()) as VNodeChild | undefined

      const checkboxClasses = cm.cn(
        cm.checkbox({ error: !!props.error }),
        ...classOf(props.className, attrs),
      )

      const inputAttrs: Record<string, unknown> = {
        ref: element,
        type: 'checkbox',
        id: checkboxId,
        name: props.name,
        disabled: props.disabled,
        'data-state': props.checked ? 'checked' : 'unchecked',
        'aria-invalid': !!props.error,
        'aria-describedby': props.error ? errorId : undefined,
        class: checkboxClasses,
        style: styleOf(props.style, attrs),
        'data-testid': props.testId,
        // React fires its checkbox `onChange` during the click that toggles
        // the input, with that click event, after the caller's `onClick` (whose
        // preventDefault() makes the browser restore the box), and restores a
        // controlled input's `checked` right after the handler returns.
        onClick: (event: MouseEvent) => {
          emit('click', event)
          emit('change', event)
          const element = event.target as HTMLInputElement | null
          if (props.checked !== undefined && element) element.checked = !!props.checked
        },
        ...restAttrs(attrs),
      }

      const children = [
        h('label', { class: cm.controlLabel }, [
          h('input', inputAttrs),
          !!label &&
            h('span', { class: cm.cn(cm.controlText, props.disabled && cm.controlDisabled) }, [
              label,
            ]),
        ]),
      ]
      if (props.error) {
        children.push(
          h('p', { id: errorId, class: cm.cn(cm.formError, cm.sp('mt', 1)) }, props.error),
        )
      }

      return h('div', { class: cm.formFieldWrapper }, children)
    }
  },
})

setDisplayName(Checkbox, 'Checkbox')
