/**
 * Vue Checkbox UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  type PropType,
  type Ref,
  ref,
  type VNodeChild,
  watch,
} from 'vue'

import type { CheckboxProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'

/** Counter backing the generated ids that stand in for React's `useId()`. */
let nextGeneratedId = 0

/** React's DOM-callback names that alias a differently spelled native event. */
const REACT_EVENT_ALIASES: Record<string, string> = {
  onDoubleClick: 'onDblclick',
}

/**
 * React forwards DOM callbacks in `...rest` verbatim (`onKeyDown`, …). Vue
 * only attaches a native listener for `on` + the DOM event name (`onKeydown`)
 * — it hyphenates anything after `on`, so React's camelCase spelling would
 * listen for an event nothing dispatches. Rewrites rest keys to the native
 * spelling: `on` + the lowercased DOM event name.
 *
 * @param attrs - The fallthrough attributes to spread onto a native element.
 * @returns The same attributes with event keys in Vue's native spelling.
 */
function nativeEventAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    out[
      REACT_EVENT_ALIASES[key] ?? (/^on[A-Z]/.test(key) ? `on${key.slice(2).toLowerCase()}` : key)
    ] = value
  }
  return out
}

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
  emits: ['change'],
  setup(props, { attrs, slots, emit }) {
    const cm = getClassMap()
    // Allocated once per instance, like React's `useId()`; it only backs
    // `errorId` when neither `id` nor `name` is given.
    const generatedId = `mol-checkbox-${nextGeneratedId++}`
    // Always track the node (for the indeterminate DOM flag) like React's
    // internalRef.
    const internalRef: Ref<HTMLInputElement | null> = ref(null)

    // React's checked prop sync sets the DOM property AND the boolean
    // `checked` attribute (removed when false). Uncontrolled inputs (no
    // `checked` prop) are left alone, so `defaultChecked` still applies.
    const syncChecked = (): void => {
      const element = internalRef.value
      if (!element || props.checked === undefined) return
      element.checked = !!props.checked
      if (props.checked) element.setAttribute('checked', '')
      else element.removeAttribute('checked')
    }

    onMounted(() => {
      syncChecked()
      if (internalRef.value) {
        internalRef.value.indeterminate = !!props.indeterminate
      }
    })
    watch(() => props.checked, syncChecked)
    watch(
      () => props.indeterminate,
      () => {
        if (internalRef.value) {
          internalRef.value.indeterminate = !!props.indeterminate
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
        ref: internalRef,
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
        // the input, with that click event, and restores a controlled input's
        // `checked` right after the handler returns.
        onClick: (event: MouseEvent) => {
          emit('change', event)
          const element = event.target as HTMLInputElement | null
          if (props.checked !== undefined && element) element.checked = !!props.checked
        },
        ...nativeEventAttrs(restAttrs(attrs)),
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
