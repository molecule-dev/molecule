/**
 * Vue Textarea UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, onMounted, type PropType, watch } from 'vue'

import type { TextareaProps } from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'

/** Counter backing the generated ids that stand in for React's `useId()`. */
let nextGeneratedId = 0

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
  emits: { change: null, focus: null, blur: null, valueChange: (_value: string) => true },
  setup(props, { attrs, emit, expose }) {
    const cm = getClassMap()
    // A column around the label, the control and the message, so the control's margin moves
    // the control on every renderer (the same layout in every framework's kit).
    const field = fieldLayout(cm)
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less textareas on the same page). Allocated once per instance, like
    // React's `useId()`.
    const generatedId = `mol-textarea-${nextGeneratedId++}`
    // The native textarea is React's `forwardRef` target; it also drives the
    // autoResize sizing and the controlled-value sync.
    const element = useElementRef<HTMLTextAreaElement>(expose)

    const resize = (): void => {
      const node = element.value
      if (!props.autoResize || !node) return
      node.style.height = 'auto'
      node.style.height = `${node.scrollHeight}px`
    }

    // Measure the controlled value after Vue applies the textarea's styles and rows.
    watch(
      [() => props.value, () => props.autoResize, () => props.minRows, () => props.maxRows],
      ([, growing, minRows, maxRows], [, wasGrowing, prevMin, prevMax]) => {
        if (wasGrowing && (!growing || minRows !== prevMin || maxRows !== prevMax) && element.value)
          element.value.style.height = ''
        resize()
      },
      { flush: 'post' },
    )

    // React renders a textarea's `value`/`defaultValue` as the DOM property
    // ONLY — no `value` attribute. Vue's `value` key patches property AND
    // attribute, so the initial value is set imperatively, exactly where
    // React's mount/update code sets it.
    const syncValue = (): void => {
      const node = element.value
      if (!node) return
      if (props.value !== undefined) node.value = String(props.value)
      else if (props.defaultValue !== undefined) node.defaultValue = props.defaultValue
    }
    watch(() => props.value, syncValue)

    // Keep measurement active when the caller forwards its own input listener.
    watch(
      [element, () => props.autoResize],
      ([node, growing], _, onCleanup) => {
        if (!node || !growing) return
        node.addEventListener('input', resize)
        onCleanup(() => node.removeEventListener('input', resize))
      },
      { flush: 'post' },
    )

    onMounted(() => {
      syncValue()
      resize()
    })

    return () => {
      const textareaId = props.id || props.name || generatedId

      const textareaClasses = cm.cn(
        cm.textarea({ error: !!props.error, size: props.size }),
        ...classOf(props.className, attrs),
      )

      const textareaAttrs: Record<string, unknown> = {
        ref: element,
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
        style: props.autoResize
          ? [
              { resize: 'none' },
              styleOf(props.style, attrs),
              {
                minHeight: `${Math.min(props.minRows, props.maxRows ?? Infinity)}lh`,
                ...(props.maxRows === undefined ? {} : { maxHeight: `${props.maxRows}lh` }),
              },
            ]
          : styleOf(props.style, attrs),
        'data-testid': props.testId,
        // React's textarea `onChange` fires on the native `input` event, and
        // it restores a controlled textarea's value right after the change
        // handler returns.
        onInput: (event: Event) => {
          emit('change', event)
          const textarea = event.target as HTMLTextAreaElement | null
          if (textarea) {
            emit('valueChange', textarea.value)
            if (props.value !== undefined) textarea.value = String(props.value)
          }
        },
        onFocusin: (event: FocusEvent) => emit('focus', event),
        onFocusout: (event: FocusEvent) => emit('blur', event),
        ...restAttrs(attrs),
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

      return h('div', { class: field.root }, children)
    }
  },
})

setDisplayName(Textarea, 'Textarea')
