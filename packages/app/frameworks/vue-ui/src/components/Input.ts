/**
 * Vue Input UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { InputProps } from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { renderIcon } from '../utilities/renderIcon.js'
import { setDisplayName } from './displayName.js'

/** Counter backing the generated ids that stand in for React's `useId()`. */
let nextGeneratedId = 0

/**
 * Vue Input UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Input: a label / field / message
 * stack where the field wraps the native input and its left/right adornments;
 * `onChange` fires on the native `input` event (React's text-input `onChange`
 * semantic) and `onFocus`/`onBlur` on `focusin`/`focusout` (React's bubbling
 * focus handlers); a controlled `value` is restored to the prop right after
 * the change handler runs, exactly like React, and rest props fall through to
 * the native input.
 */
export const Input = defineComponent({
  name: 'MInput',
  inheritAttrs: false,
  props: {
    type: {
      type: String as PropType<InputProps['type']>,
      default: 'text',
    },
    size: {
      type: String as PropType<InputProps['size']>,
      default: 'md',
    },
    align: String as PropType<InputProps['align']>,
    label: String,
    error: String,
    hint: String,
    leftElement: null,
    rightElement: null,
    clearable: {
      type: Boolean,
      default: false,
    },
    clearLabel: String,
    className: String,
    style: [String, Object] as PropType<InputProps['style']>,
    testId: String,
    disabled: {
      type: Boolean,
      default: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
    value: [String, Number] as PropType<InputProps['value']>,
    defaultValue: [String, Number] as PropType<InputProps['defaultValue']>,
    placeholder: String,
    name: String,
    id: String,
  },
  emits: ['change', 'clear', 'focus', 'blur'],
  setup(props, { attrs, slots, emit, expose }) {
    const cm = getClassMap()
    // A column around the label, the control's row and the message, so the control's margin
    // moves the control on every renderer (the same layout in every framework's kit).
    const field = fieldLayout(cm)
    const { t } = useTranslation()
    // The native input is React's `forwardRef` target, not the label wrapper.
    const element = useElementRef<HTMLInputElement>(expose)
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less inputs on the same page). Allocated once per instance, like
    // React's `useId()`; the conformance normalizer renumbers ids by
    // document order either way.
    const generatedId = `mol-input-${nextGeneratedId++}`

    return () => {
      const inputId = props.id || props.name || generatedId
      const leftElementNode = props.leftElement ?? slots.leftElement?.()
      const leftElement = toChildArray(leftElementNode).length > 0 ? leftElementNode : undefined
      const rightElementNode = props.rightElement ?? slots.rightElement?.()
      const rightElement = toChildArray(rightElementNode).length > 0 ? rightElementNode : undefined

      const inputClasses = cm.cn(
        cm.input({ error: !!props.error, size: props.size, align: props.align }),
        !!leftElement && cm.inputPadLeft,
        !!(rightElement || props.clearable) && cm.inputPadRight,
        ...classOf(props.className, attrs),
      )

      const inputAttrs: Record<string, unknown> = {
        ref: element,
        type: props.type,
        id: inputId,
        name: props.name,
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
        style: styleOf(props.style, attrs),
        'data-testid': props.testId,
        // React's text-input `onChange` fires on the native `input` event,
        // and it restores a controlled input's value right after the change
        // handler returns.
        onInput: (event: Event) => {
          emit('change', event)
          const element = event.target as HTMLInputElement | null
          if (props.value !== undefined && element) element.value = String(props.value)
        },
        // React's onFocus/onBlur use the bubbling focus events.
        onFocusin: (event: FocusEvent) => emit('focus', event),
        onFocusout: (event: FocusEvent) => emit('blur', event),
        ...restAttrs(attrs),
      }
      // Never pass both: an uncontrolled input's `value` key would set the
      // dirty flag and block `defaultValue` from updating the property.
      if (props.value !== undefined) inputAttrs.value = props.value
      else if (props.defaultValue !== undefined) inputAttrs.defaultValue = props.defaultValue

      const innerChildren: VNodeChild[] = []
      if (leftElement) {
        innerChildren.push(h('div', { class: cm.inputLeftElement }, [leftElement]))
      }
      innerChildren.push(h('input', inputAttrs))
      if (rightElement || (props.clearable && props.value)) {
        innerChildren.push(
          h(
            'div',
            { class: cm.inputRightElement },
            props.clearable && props.value
              ? h(
                  'button',
                  {
                    type: 'button',
                    onClick: (event: MouseEvent) => emit('clear', event),
                    class: cm.inputClearButton,
                    'aria-label':
                      props.clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' }),
                  },
                  [renderIcon('x-mark', cm.iconSm)],
                )
              : h('span', { class: cm.textMuted }, [rightElement]),
          ),
        )
      }

      const rootChildren: VNodeChild[] = []
      if (props.label) {
        rootChildren.push(
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
      rootChildren.push(h('div', { class: field.inner }, innerChildren))
      if (props.error) {
        rootChildren.push(h('p', { id: `${inputId}-error`, class: cm.formError }, props.error))
      }
      if (props.hint && !props.error) {
        rootChildren.push(h('p', { id: `${inputId}-hint`, class: cm.formHint }, props.hint))
      }

      return h('div', { class: field.root }, rootChildren)
    }
  },
})

setDisplayName(Input, 'Input')
