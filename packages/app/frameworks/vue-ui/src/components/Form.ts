/**
 * Form components.
 *
 * @module
 */

import {
  cloneVNode,
  defineComponent,
  getCurrentInstance,
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
import { useElementRef } from '../utilities/elementRef.js'
import { setDisplayName } from './displayName.js'
import { formSubmitErrorMessages } from './formSubmitError.js'

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
    // Vue's "no runtime type validation" declaration: the opaque failure value
    // React accepts passes through without a runtime type check.
    submitError: null,
    className: String,
    style: [String, Object] as PropType<FormProps['style']>,
    testId: String,
    // The submit handlers are declared props, so each submit calls the ones the parent passed
    // last (a value read from attrs in setup would keep the first render's handler). Absent,
    // a prop is undefined: React's `!onFormSubmit && !onSubmit` check reads the same.
    onFormSubmit: Function as PropType<FormProps['onFormSubmit']>,
    onSubmit: Function as PropType<FormProps['onSubmit']>,
  },
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const element = useElementRef<HTMLFormElement>(expose)
    // React decides "the caller owns the error" with
    // `Object.hasOwn(props, 'submitError')`, which is false when the prop was
    // never passed. Vue's declared props always exist on `props` (undefined
    // when absent), so presence is read from the vnode the parent rendered
    // this instance with — a caller who passes `submitError={undefined}`
    // controls the error (and clears a captured failure), exactly as in React.
    // Outside an instance (a unit test calling `setup` directly) the props
    // object itself is the answer.
    const instance = getCurrentInstance()
    const submitErrorProvided = (): boolean => {
      const vnodeProps = instance?.vnode.props
      if (!vnodeProps) return Object.hasOwn(props, 'submitError')
      return Object.hasOwn(vnodeProps, 'submitError') || Object.hasOwn(vnodeProps, 'submit-error')
    }
    const failure = ref<{ error: unknown } | null>(null)
    const pending = ref(false)
    let attempt = 0
    // React's mount-effect cleanup bumps the attempt counter, so a submission
    // still in flight when the form unmounts can never set state again.
    onUnmounted(() => {
      attempt++
    })

    // Bound only as the <form> element's submit listener, so currentTarget is that form,
    // as React's FormEvent<HTMLFormElement> types it.
    const handleSubmit = async (e: Event & { currentTarget: HTMLFormElement }): Promise<void> => {
      const { onFormSubmit, onSubmit } = props
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
          const formData = new FormData(e.currentTarget)
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
      const error = submitErrorProvided()
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

      const rest = restAttrs(attrs)

      return h(
        'form',
        {
          ref: element,
          class: cm.cn(...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          action: props.action,
          method: props.method,
          noValidate: props.noValidate,
          onSubmit: handleSubmit,
          ...rest,
        },
        children,
      )
    }
  },
})

setDisplayName(Form, 'Form')

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
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)
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
          ref: element,
          class: cm.cn(cm.inputWrapper, cm.sp('mb', 4), ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          ...restAttrs(attrs),
        },
        rootChildren,
      )
    }
  },
})

setDisplayName(FormField, 'FormField')

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
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLLabelElement>(expose)

    return () =>
      h(
        'label',
        {
          ref: element,
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

setDisplayName(Label, 'Label')
