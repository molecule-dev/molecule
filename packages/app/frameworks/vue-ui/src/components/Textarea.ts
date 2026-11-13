/**
 * Vue Textarea UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  type Ref,
  ref,
  watch,
} from 'vue'

import type { TextareaProps } from '@molecule/app-ui'
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
 * Vue Textarea UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Textarea: label / field /
 * message stack, `onChange` on the native `input` event and
 * `onFocus`/`onBlur` on `focusin`/`focusout` (React's bubbling semantics),
 * a controlled `value` restored to the prop right after the change handler
 * runs, and an `autoResize` mode that sizes the box from `minRows`/`maxRows`
 * on mount, on value changes and on real `input` events (uncontrolled
 * typing included).
 */
export const Textarea = defineComponent({
  name: 'MTextarea',
  inheritAttrs: false,
  props: {
    size: {
      type: String as PropType<TextareaProps['size']>,
      default: 'md',
    },
    label: String,
    error: String,
    hint: String,
    autoResize: {
      type: Boolean,
      default: false,
    },
    minRows: {
      type: Number,
      default: 3,
    },
    maxRows: Number,
    className: String,
    style: [String, Object] as PropType<TextareaProps['style']>,
    testId: String,
    disabled: {
      type: Boolean,
      default: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
    value: String as PropType<TextareaProps['value']>,
    defaultValue: String as PropType<TextareaProps['defaultValue']>,
    placeholder: String,
    name: String,
    id: String,
    rows: Number,
  },
  emits: ['change', 'focus', 'blur'],
  setup(props, { attrs, emit }) {
    const cm = getClassMap()
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less textareas on the same page). Allocated once per instance, like
    // React's `useId()`.
    const generatedId = `mol-textarea-${nextGeneratedId++}`
    // Always track the node (for autoResize) like React's internalRef.
    const internalRef: Ref<HTMLTextAreaElement | null> = ref(null)

    const resize = (): void => {
      const element = internalRef.value
      if (!props.autoResize || !element) return
      element.style.height = 'auto'
      const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20
      const minHeight = props.minRows * lineHeight
      const maxHeight = props.maxRows ? props.maxRows * lineHeight : Infinity
      const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
      element.style.height = `${newHeight}px`
    }

    // Controlled usage (value tracked by the caller) recomputes here, and a
    // change of the sizing options re-runs it (React re-runs when `resize`
    // is recreated).
    watch(
      [() => props.value, () => props.autoResize, () => props.minRows, () => props.maxRows],
      resize,
    )

    // React renders a textarea's `value`/`defaultValue` as the DOM property
    // ONLY — no `value` attribute. Vue's `value` key patches property AND
    // attribute, so the initial value is set imperatively, exactly where
    // React's mount/update code sets it.
    const syncValue = (): void => {
      const element = internalRef.value
      if (!element) return
      if (props.value !== undefined) element.value = String(props.value)
      else if (props.defaultValue !== undefined) element.defaultValue = props.defaultValue
    }
    watch(() => props.value, syncValue)

    // Uncontrolled usage (defaultValue + the user typing) never changes
    // `value`, so the watch above never fires — listening for real `input`
    // events on the element itself catches keystrokes, paste, and IME
    // composition regardless of whether the caller tracks `value`.
    const onInputResize = (): void => resize()
    onMounted(() => {
      syncValue()
      resize()
      const element = internalRef.value
      if (props.autoResize && element) element.addEventListener('input', onInputResize)
    })
    onUnmounted(() => {
      const element = internalRef.value
      if (element) element.removeEventListener('input', onInputResize)
    })

    return () => {
      const textareaId = props.id || props.name || generatedId

      const textareaClasses = cm.cn(
        cm.textarea({ error: !!props.error, size: props.size }),
        ...classOf(props.className, attrs),
      )

      const textareaAttrs: Record<string, unknown> = {
        ref: internalRef,
        id: textareaId,
        name: props.name,
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
        // autoResize sizes the box to its content via inline height, but the
        // bond's min-h class would floor it — neutralize it and let resize()
        // enforce `minRows` instead. Caller style still wins.
        style: props.autoResize
          ? [{ minHeight: 0, resize: 'none' }, styleOf(props.style, attrs)]
          : styleOf(props.style, attrs),
        'data-testid': props.testId,
        // React's textarea `onChange` fires on the native `input` event, and
        // it restores a controlled textarea's value right after the change
        // handler returns.
        onInput: (event: Event) => {
          emit('change', event)
          const element = event.target as HTMLTextAreaElement | null
          if (props.value !== undefined && element) element.value = String(props.value)
        },
        onFocusin: (event: FocusEvent) => emit('focus', event),
        onFocusout: (event: FocusEvent) => emit('blur', event),
        ...nativeEventAttrs(restAttrs(attrs)),
      }

      const children = [h('textarea', textareaAttrs)]
      if (props.label) {
        children.unshift(
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
      if (props.error) {
        children.push(h('p', { id: `${textareaId}-error`, class: cm.formError }, props.error))
      }
      if (props.hint && !props.error) {
        children.push(h('p', { id: `${textareaId}-hint`, class: cm.formHint }, props.hint))
      }

      return h('div', { class: cm.inputWrapper }, children)
    }
  },
})
