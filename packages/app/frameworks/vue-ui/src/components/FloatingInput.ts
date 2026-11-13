/**
 * Vue FloatingInput UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'

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

/** Counter backing the generated ids that stand in for React's `useId()`. */
let nextGeneratedId = 0

/**
 * Vue FloatingInput UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s FloatingInput: an input whose
 * placeholder text doubles as a small uppercase label floating at the top of
 * the field. The floating text is a real `<label htmlFor>`, so it is the
 * input's programmatic accessible name via label association. Works as both a
 * controlled and an uncontrolled input: when `value` is omitted, the component
 * tracks its own state seeded from `defaultValue` and still forwards every
 * change event to the caller; `id` falls back to a generated id when the
 * caller doesn't pass one (mirroring Input/Select/Textarea's id-collision
 * fix). Rest props fall through to the native input, `onChange` fires on the
 * native `input` event (React's text-input semantic) and `onFocus`/`onBlur`
 * on `focusin`/`focusout` (React's bubbling focus handlers).
 */
export const FloatingInput = defineComponent({
  name: 'MFloatingInput',
  inheritAttrs: false,
  props: {
    placeholder: String,
    className: String,
    value: [String, Number] as PropType<string | number>,
    defaultValue: [String, Number] as PropType<string | number>,
    id: String,
  },
  emits: ['change', 'focus', 'blur'],
  setup(props, { attrs, emit }) {
    const cm = getClassMap()
    const internalValue = ref(String(props.defaultValue ?? ''))
    const generatedId = `mol-floating-input-${nextGeneratedId++}`

    const handleChange = (e: Event): void => {
      emit('change', e)
      const element = e.target as HTMLInputElement | null
      // A controlled input is restored to the prop right after the change
      // handler runs, exactly like React; an uncontrolled one keeps what the
      // user typed (tracked internally).
      if (props.value !== undefined && element) element.value = String(props.value)
      else if (element) internalValue.value = element.value
    }

    return () => {
      const isControlled = props.value !== undefined
      const value = isControlled ? props.value : internalValue.value
      const inputId = props.id || generatedId

      return h('span', { class: cm.floatingInputWrapper }, [
        h('input', {
          id: inputId,
          ...nativeEventAttrs(restAttrs(attrs)),
          placeholder: props.placeholder,
          class: cm.cn(cm.input(), cm.floatingInput, ...classOf(props.className, attrs)),
          value,
          onInput: handleChange,
          // React's onFocus/onBlur use the bubbling focus events.
          onFocusin: (event: FocusEvent) => emit('focus', event),
          onFocusout: (event: FocusEvent) => emit('blur', event),
          style: styleOf(undefined, attrs),
        }),
        ...(props.placeholder
          ? [h('label', { for: inputId, class: cm.floatingLabel }, props.placeholder)]
          : []),
      ])
    }
  },
})
