/**
 * Form components.
 *
 * @module
 */

import {
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  onUnmounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
} from 'vue'

import type { FormProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { formSubmitErrorMessages } from './formSubmitError.js'

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

/** Props for the Vue form, including a failure managed by an external form controller. */
export interface ReactFormProps extends FormProps {
  /** A rejected submission, for example useForm().formState.submitError. */
  submitError?: unknown
}

/**
 * Vue Form UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Form. Rejected async handlers
 * render an accessible server-error list by default. A new submit clears the
 * previous failure; native action/method forms retain native submission.
 */
export const Form = defineComponent({
  name: 'MForm',
  inheritAttrs: false,
  props: {
    action: String,
    method: String as PropType<FormProps['method']>,
    noValidate: Boolean,
    submitting: Boolean,
    submitError: null as unknown as PropType<ReactFormProps['submitError']>,
    className: String,
    style: [String, Object] as PropType<FormProps['style']>,
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // React's `onFormSubmit` / `onSubmit` are named props its Form branches on
    // (no handlers at all means the submit event is left untouched), so the raw
    // handlers are read from the incoming `on*` attrs instead of declared
    // emits — a declared emit strips its listener out of `attrs` and the
    // presence check would never see it.
    const onFormSubmit = attrs.onFormSubmit as
      ((data: Record<string, unknown>) => void | Promise<void>) | undefined
    const onSubmit = attrs.onSubmit as ((event: Event) => void | Promise<void>) | undefined
    const failure = ref<{ error: unknown } | null>(null)
    const pending = ref(false)
    let attempt = 0
    // React's mount-effect cleanup bumps the attempt counter, so a submission
    // still in flight when the form unmounts can never set state again.
    onUnmounted(() => {
      attempt++
    })

    const handleSubmit = async (e: Event): Promise<void> => {
      if (!onFormSubmit && !onSubmit) return
      const current = ++attempt
      failure.value = null
      pending.value = true
      try {
        const submissions: Promise<void>[] = []
        const call = (handler: () => void | Promise<void>): void => {
          try {
            submissions.push(Promise.resolve(handler()))
          } catch (error) {
            submissions.push(Promise.reject(error))
          }
        }
        if (onFormSubmit) {
          e.preventDefault()
          const formData = new FormData(e.currentTarget as HTMLFormElement)
          const data: Record<string, unknown> = {}
          formData.forEach((value, key) => {
            data[key] = value
          })
          call(() => onFormSubmit(data))
        }
        // Call both handlers before yielding: the native event's currentTarget is still valid.
        call(() => onSubmit?.(e))
        await Promise.all(submissions)
      } catch (error) {
        if (attempt === current) failure.value = { error }
      } finally {
        if (attempt === current) pending.value = false
      }
    }

    return () => {
      const error = Object.hasOwn(props, 'submitError')
        ? props.submitError === undefined
          ? null
          : { error: props.submitError }
        : failure.value
      const messages = error
        ? formSubmitErrorMessages(
            error.error,
            t('ui.form.submitError', undefined, {
              defaultValue: 'Unable to submit. Please try again.',
            }),
          )
        : []

      const children: VNodeChild[] = []
      if (messages.length > 0) {
        children.push(
          h(
            'ul',
            { role: 'alert', class: cm.formError },
            messages.map((message, index) => h('li', { key: index }, message)),
          ),
        )
      }
      children.push(
        h(
          'fieldset',
          { disabled: props.submitting || pending.value, class: cm.formFieldsetContents },
          slots.default?.(),
        ),
      )

      // React destructures `onFormSubmit` / `onSubmit` out of its rest spread;
      // this port calls them from `handleSubmit` instead, so they are removed
      // from the fallthrough the same way.
      const rest = restAttrs(attrs)
      delete rest.onFormSubmit
      delete rest.onSubmit

      return h(
        'form',
        {
          class: cm.cn(...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          action: props.action,
          method: props.method,
          noValidate: props.noValidate,
          onSubmit: handleSubmit,
          ...nativeEventAttrs(rest),
        },
        children,
      )
    }
  },
})

/**
 * Form field wrapper component.
 *
 * Faithful port of `@molecule/app-ui-react`'s FormField: the label, the field
 * and the error/hint note, with `id` / `aria-describedby` / `aria-invalid`
 * injected onto a single real child element so its label association and the
 * announced description resolve correctly (composite or multiple children fall
 * back to label-only association).
 */
export const FormField = defineComponent({
  name: 'MFormField',
  inheritAttrs: false,
  props: {
    label: String,
    name: String,
    error: String,
    hint: String,
    required: Boolean,
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    // Fall back to a generated id when `name` is absent so `htmlFor`/the
    // error-message id never resolve to the literal string "undefined" —
    // and so they never collide across multiple id-less FormFields on the
    // same page (same class of bug fixed inside Input/Select/Textarea).
    // Allocated once per instance, like React's `useId()`; the conformance
    // normalizer renumbers ids by document order either way.
    const generatedId = `mol-form-field-${nextGeneratedId++}`
    return () => {
      const fieldId = props.name || generatedId
      const errorId = `${fieldId}-error`
      const hintId = `${fieldId}-hint`
      const describedBy = props.error ? errorId : props.hint ? hintId : undefined

      // The error/hint <p> below is a same-DOM sibling — invisible to a
      // screen reader unless something actually points `aria-describedby` at
      // it. When the default slot holds a single real element (the common
      // case: one Input/Select/Textarea), inject `id`/`aria-describedby`/
      // `aria-invalid` onto it directly so its own label association and the
      // announced description both resolve correctly. Composite/text children
      // can't be safely cloned into, so they fall back to label-only
      // association — consumers with custom composite fields should wire their
      // own `aria-describedby` (Input/Select/Textarea's own `error` prop
      // remains the fully-automatic path).
      const children = slots.default?.() ?? []
      const singleChild =
        children.length === 1 && isVNode(children[0]) ? (children[0] as VNode) : null
      const content: VNodeChild = singleChild
        ? cloneVNode(singleChild, {
            id: (singleChild.props?.id as string | undefined) || fieldId,
            ...(describedBy
              ? {
                  'aria-describedby': [
                    singleChild.props?.['aria-describedby'] as string | undefined,
                    describedBy,
                  ]
                    .filter(Boolean)
                    .join(' '),
                }
              : {}),
            ...(props.error ? { 'aria-invalid': true } : {}),
          })
        : children

      const rootChildren: VNodeChild[] = []
      if (props.label) {
        rootChildren.push(
          h(
            'label',
            {
              for: singleChild ? (singleChild.props?.id as string | undefined) || fieldId : fieldId,
              class: cm.cn(cm.label({ required: !!props.required }), cm.labelBlock),
            },
            props.label,
          ),
        )
      }
      rootChildren.push(content)
      if (props.error) {
        rootChildren.push(h('p', { id: errorId, class: cm.formError }, props.error))
      }
      if (props.hint && !props.error) {
        rootChildren.push(h('p', { id: hintId, class: cm.formHint }, props.hint))
      }

      return h(
        'div',
        {
          class: cm.cn(cm.inputWrapper, cm.sp('mb', 4), ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
        },
        rootChildren,
      )
    }
  },
})

/**
 * Vue Label UI component for form fields, with optional required indicator.
 *
 * Faithful port of `@molecule/app-ui-react`'s Label: the required marker and
 * the caller's className on one `<label>`, every other attribute (htmlFor,
 * aria-*, data-*, …) forwarded verbatim like React's rest spread.
 */
export const Label = defineComponent({
  name: 'MLabel',
  inheritAttrs: false,
  props: {
    required: Boolean,
    className: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    return () =>
      h(
        'label',
        {
          ...restAttrs(attrs),
          class: cm.cn(
            cm.label({ required: !!props.required }),
            ...classOf(props.className, attrs),
          ),
          style: styleOf(undefined, attrs),
        },
        slots.default?.(),
      )
  },
})
