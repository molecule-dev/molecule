/**
 * Form components.
 *
 * @module
 */

import {
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

import { resolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { FormFieldProps, FormProps } from '../types.js'
import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'
import { formSubmitErrorMessages } from './formSubmitError.js'

// Web bundlers substitute this at build time.
declare const process: { env: { NODE_ENV?: string } }

/** Props for the Solid form, including a failure managed by an external form controller. */
export interface SolidFormProps extends FormProps {
  /** A rejected submission, for example a form controller's `submitError`. */
  submitError?: unknown
}

/**
 * Props for the form under React's name, so code typed against
 * `@molecule/app-ui-react`'s `Form` compiles unchanged after swapping the
 * binding: React's members (`FormProps` plus the opaque `submitError`) in
 * Solid's form.
 *
 * Equal to {@link SolidFormProps} by definition, so the React-named contract
 * and the Solid one cannot drift.
 */
export type ReactFormProps = SolidFormProps

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
export const Form = withDisplayName<WithRef<SolidFormProps, HTMLFormElement>>((props) => {
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
      const entries = Array.from(new FormData(e.currentTarget))
      // `Object.fromEntries` defines every name as an own key: a repeated name
      // keeps its last value, and `__proto__` stays an ordinary field instead
      // of replacing the object's prototype.
      const collected: Record<string, unknown> = Object.fromEntries(entries)
      if (process.env.NODE_ENV !== 'production' && Object.keys(collected).length < entries.length) {
        console.error(
          "Form.onFormSubmit received repeated field names and keeps only their last values. Use the form's onSubmit handler for repeated entries.",
        )
      }
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
        call(() => local.onSubmit?.(e))
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
      onReset={local.onReset}
      {...reactDomProps(rest)}
    >
      <Show when={messages().length > 0}>
        <ul role="alert" class={cm.formError}>
          {/* React keys the messages `key={index}`, so `<Index>` — a
              position's `<li>` survives and its text updates. */}
          <Index each={messages()}>{(message) => <li>{message()}</li>}</Index>
        </ul>
      </Show>
      <fieldset disabled={local.submitting || pending()} class={cm.formFieldsetContents}>
        {local.children}
      </fieldset>
    </form>
  )
}, 'Form')

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
export const FormField = withDisplayName<WithRef<FormFieldProps, HTMLDivElement>>((props) => {
  const [local, rest] = splitProps(props, [
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

  // The children as they render now. `children` resolves them once per change,
  // so the nodes are kept between reads, and it follows children that change (a
  // `<For>` of fields counts its items, as React counts an array).
  const resolvedChildren = resolveNode(() => local.children)
  // The single element React's `isValidElement(children)` clones into, else null.
  const singleChild = (): Element | null => {
    const nodes = resolvedChildren.toArray()
    return nodes.length === 1 && nodes[0] instanceof Element ? nodes[0] : null
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
    if (!child || !wrapperRef) {
      // No single child (any more): the label points at the field id, as React's does.
      setChildId(undefined)
      return
    }
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
      {...reactDomProps(rest)}
    >
      <Show when={local.label}>
        <label
          for={labelFor()}
          class={cm.cn(cm.label({ required: !!local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      {resolvedChildren()}
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
}, 'FormField')

/**
 * Renders the Label component.
 * @param props - The label attributes (`required` adds the marker).
 * @returns The rendered label JSX.
 */
export const Label = withDisplayName<
  WithRef<
    {
      children?: JSX.Element
      required?: boolean
      className?: string
    } & JSX.HTMLAttributes<HTMLLabelElement>,
    HTMLLabelElement
  >
>((props) => {
  const [local, rest] = splitProps(props, ['children', 'required', 'className', 'style'])
  const cm = getClassMap()

  return (
    <label
      class={cm.cn(cm.label({ required: !!local.required }), local.className)}
      {...reactDomProps(rest)}
    >
      {local.children}
    </label>
  )
}, 'Label')
