/**
 * Form components.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  Index,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { FormFieldProps, FormProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { formSubmitErrorMessages } from './formSubmitError.js'

/** Props for the Solid form, including a failure managed by an external form controller. */
export interface SolidFormProps extends FormProps {
  /** A rejected submission, for example a form controller's `submitError`. */
  submitError?: unknown
}

/**
 * Renders the Form component.
 *
 * Rejected async handlers render an accessible server-error list by default.
 * A new submit clears the previous failure; native action/method forms
 * retain native submission.
 *
 * @param props - The component props.
 * @returns The rendered form JSX.
 */
export const Form: Component<SolidFormProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'onFormSubmit',
    'submitting',
    'submitError',
    'className',
    'style',
    'testId',
    'onSubmit',
    'onReset',
    'action',
    'method',
    'noValidate',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const [failure, setFailure] = createSignal<{ error: unknown } | null>(null)
  const [pending, setPending] = createSignal(false)
  let attempt = 0
  onCleanup(() => {
    attempt++
  })

  const handleSubmit = (e: SubmitEvent & { currentTarget: HTMLFormElement }): void => {
    if (!local.onFormSubmit && !local.onSubmit) return
    const current = ++attempt
    // Collect the form data BEFORE the pending fieldset disables the
    // controls: React's setState defers its re-render past this read, while
    // Solid's signal update re-renders synchronously — reading after
    // `setPending(true)` would hand the caller an empty object.
    let data: Record<string, unknown> | undefined
    if (local.onFormSubmit) {
      e.preventDefault()
      const collected: Record<string, unknown> = {}
      new FormData(e.currentTarget).forEach((value, key) => {
        collected[key] = value
      })
      data = collected
    }
    setFailure(null)
    setPending(true)
    void (async (): Promise<void> => {
      try {
        const submissions: Promise<void>[] = []
        const call = (handler: () => void | Promise<void>): void => {
          try {
            submissions.push(Promise.resolve(handler()))
          } catch (error) {
            submissions.push(Promise.reject(error))
          }
        }
        if (local.onFormSubmit && data) {
          call(() => local.onFormSubmit?.(data))
        }
        // Call both handlers before yielding: the native event's currentTarget is still valid.
        call(() => local.onSubmit?.(e as unknown as Event))
        await Promise.all(submissions)
      } catch (error) {
        if (attempt === current) setFailure({ error })
      } finally {
        if (attempt === current) setPending(false)
      }
    })()
  }

  const error = createMemo<{ error: unknown } | null>(() => {
    if ('submitError' in props) {
      return local.submitError === undefined ? null : { error: local.submitError }
    }
    return failure()
  })

  const messages = createMemo<string[]>(() => {
    const current = error()
    return current
      ? formSubmitErrorMessages(
          current.error,
          t('ui.form.submitError', undefined, {
            defaultValue: 'Unable to submit. Please try again.',
          }),
        )
      : []
  })

  return (
    <form
      class={local.className}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      action={local.action}
      method={local.method}
      noValidate={local.noValidate}
      onSubmit={handleSubmit}
      onReset={local.onReset as JSX.EventHandlerUnion<HTMLFormElement, Event>}
      {...(rest as JSX.FormHTMLAttributes<HTMLFormElement>)}
    >
      <Show when={messages().length > 0}>
        <ul role="alert" class={cm.formError}>
          {/* React keys the messages `key={index}`, so `<Index>` — a
              position's `<li>` survives and its text updates. */}
          <Index each={messages()}>{(message) => <li>{message()}</li>}</Index>
        </ul>
      </Show>
      <fieldset disabled={local.submitting || pending()} class={cm.formFieldsetContents}>
        {local.children as JSX.Element}
      </fieldset>
    </form>
  )
}

/**
 * Renders the FormField wrapper component.
 *
 * The error/hint `<p>` below is a same-DOM sibling — invisible to a screen
 * reader unless something actually points `aria-describedby` at it. When
 * `children` is a single element (the common case: one Input/Select/
 * Textarea/Checkbox), `id`/`aria-describedby`/`aria-invalid` are injected
 * onto its form control directly so its own label association and the
 * announced description both resolve correctly. Composite/text children
 * can't be safely injected into, so they fall back to label-only
 * association — consumers with custom composite fields should wire their
 * own `aria-describedby` (Input/Select/Textarea's own `error` prop remains
 * the fully-automatic path).
 *
 * @param props - The component props.
 * @returns The rendered form field JSX.
 */
export const FormField: Component<FormFieldProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'label',
    'name',
    'error',
    'hint',
    'required',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  // Fall back to a generated id when `name` is absent so `htmlFor`/the
  // error-message id never resolve to the literal string "undefined" —
  // and so they never collide across multiple id-less FormFields on the
  // same page (same class of bug fixed inside Input/Select/Textarea).
  const generatedId = createUniqueId()
  const fieldId = (): string => local.name || generatedId
  const errorId = (): string => `${fieldId()}-error`
  const hintId = (): string => `${fieldId()}-hint`

  const singleChild = (): unknown => {
    const child = local.children
    if (Array.isArray(child)) return null
    return child ?? null
  }

  // The child's own id wins over the field id (React reads it from the
  // child's props at render time; here it is read from the mounted control).
  const [childId, setChildId] = createSignal<string | undefined>(undefined)
  const labelFor = (): string => childId() || fieldId()

  const describedBy = (): string | undefined =>
    local.error ? errorId() : local.hint ? hintId() : undefined

  let wrapperRef: HTMLDivElement | undefined
  let originalDescribedBy: string | null | undefined
  let injectedInvalid = false

  // Inject id / aria-describedby / aria-invalid onto the single child's
  // form control after it mounts (React clones these into the child's
  // props; a Solid child is already composed, so the rendered control —
  // the child element itself, or its first input/textarea/select — carries
  // them instead).
  createEffect(() => {
    void local.error
    void local.hint
    const target = describedBy()
    const child = singleChild()
    if (!child || !wrapperRef) return
    const root =
      wrapperRef.querySelector('input, textarea, select') ??
      ((): Element | null => {
        // No form control inside: the child element itself (React would
        // have cloned onto whatever the child was).
        const skip = ['P', 'LABEL']
        for (const el of Array.from(wrapperRef.children)) {
          if (!skip.includes(el.tagName)) return el
        }
        return null
      })()
    if (!root) return
    if (originalDescribedBy === undefined)
      originalDescribedBy = root.getAttribute('aria-describedby')
    root.setAttribute('id', root.id || fieldId())
    setChildId(root.id)
    const next = [originalDescribedBy, target].filter(Boolean).join(' ')
    if (next) root.setAttribute('aria-describedby', next)
    else if (originalDescribedBy === null) root.removeAttribute('aria-describedby')
    if (local.error) {
      root.setAttribute('aria-invalid', 'true')
      injectedInvalid = true
    } else if (injectedInvalid) {
      root.removeAttribute('aria-invalid')
      injectedInvalid = false
    }
  })

  return (
    <div
      ref={(el) => {
        wrapperRef = el
      }}
      class={cm.cn(cm.inputWrapper, cm.sp('mb', 4), local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
    >
      <Show when={local.label}>
        <label
          for={labelFor()}
          class={cm.cn(cm.label({ required: !!local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      {local.children as JSX.Element}
      <Show when={local.error}>
        <p id={errorId()} class={cm.formError}>
          {local.error}
        </p>
      </Show>
      <Show when={local.hint && !local.error}>
        <p id={hintId()} class={cm.formHint}>
          {local.hint}
        </p>
      </Show>
    </div>
  )
}

/**
 * Renders the Label component.
 * @param props - The label attributes (`required` adds the marker).
 * @returns The rendered label JSX.
 */
export const Label: Component<
  {
    children?: JSX.Element
    required?: boolean
    className?: string
  } & JSX.HTMLAttributes<HTMLLabelElement>
> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'required', 'className', 'style'])
  const cm = getClassMap()

  return (
    <label class={cm.cn(cm.label({ required: !!local.required }), local.className)} {...rest}>
      {local.children}
    </label>
  )
}
