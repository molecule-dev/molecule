/**
 * Form component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, isDevMode, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { FormProps, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { formSubmitErrorMessages } from '../utilities/form-submit-error.js'
import { styleText } from '../utilities/style.js'

/**
 * Props for {@link Form} (React's `ReactFormProps`, in Angular's form).
 *
 * React's form adds one prop to the core `FormProps`: a failure managed by an
 * external form controller (`useForm().formState.submitError`). Binding the
 * `submitError` input is the Angular equivalent — the form then renders the
 * same accessible server-error list instead of the failure it captured.
 */
export interface ReactFormProps extends FormProps {
  /** A rejected submission, for example useForm().formState.submitError. */
  submitError?: unknown
}

/**
 * Form component.
 *
 * The host is the `<form>` itself (`form[mol-form]`), exactly React's root.
 * A rejected async handler renders an accessible server-error list by
 * default; a new submit clears the previous failure. Native action/method
 * forms keep native submission.
 */
@Component({
  selector: 'form[mol-form]',
  standalone: true,
  inputs: [
    'onFormSubmit',
    'onSubmit',
    'onReset',
    'submitting',
    'submitError',
    'action',
    'method',
    'noValidate',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
  ],
  host: {
    '[class]': 'className',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
    '[attr.action]': 'action ?? null',
    '[attr.method]': 'method ?? null',
    '[attr.novalidate]': 'noValidate ? "" : null',
    '(submit)': 'handleSubmit($event)',
    '(reset)': 'handleReset($event)',
  },
  template: `@if (messages().length > 0) {
      <ul role="alert" [class]="cm().formError">
        @for (message of messages(); track $index) {
          <li>{{ message }}</li>
        }
      </ul>
    }
    <fieldset
      [class]="cm().formFieldsetContents"
      [attr.disabled]="submitting || pending() ? '' : null"
    >
      <ng-content></ng-content>
    </fieldset>`,
})
export class Form implements HasElement<HTMLFormElement> {
  /** Collects the form's data on submit (React's `onFormSubmit`). */
  onFormSubmit?: ReactFormProps['onFormSubmit']
  /** Receives the submit event (React's `onSubmit`). */
  onSubmit?: ReactFormProps['onSubmit']
  /** Receives the reset event (React's `onReset`). */
  onReset?: ReactFormProps['onReset']
  /** Whether the form is submitting (disables the fieldset). */
  submitting?: ReactFormProps['submitting']
  /** Native form action. */
  action?: ReactFormProps['action']
  /** Native form method. */
  method?: ReactFormProps['method']
  /** Whether native validation is disabled. */
  noValidate?: ReactFormProps['noValidate']
  /** Extra classes for the form. */
  className?: ReactFormProps['className']
  /** Inline style object (React camelCase). */
  style?: ReactFormProps['style']
  /** `data-testid`. */
  testId?: ReactFormProps['testId']
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: ReactFormProps['automationId']
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /** Whether a submit is in flight. */
  readonly pending = signal(false)
  /** The failure the last submit produced. */
  private readonly failure = signal<{ error: unknown } | null>(null)
  /** A submit counter: a later submit supersedes an earlier settling one. */
  private attempt = 0
  /** The controlled failure's current value. */
  private controlledError: unknown
  /** Whether the caller has written `submitError` (React's `Object.hasOwn`). */
  private controlled = false
  private readonly host: ElementRef<HTMLFormElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<form>`. */
  readonly element = hostElement(this.host)

  /**
   * A failure managed by an external form controller (React's `submitError`
   * prop).
   *
   * An accessor, not a field: Angular writes an input by assigning the
   * property, so the write itself is the "this prop was passed" signal React
   * reads with `Object.hasOwn(props, 'submitError')`. A caller that binds
   * `[submitError]` therefore owns the error UI — an explicit `undefined`
   * clears a failure the form captured itself.
   *
   * @returns The controlled failure, as the caller last wrote it.
   */
  get submitError(): ReactFormProps['submitError'] {
    return this.controlledError
  }

  /**
   * Records the caller's controlled failure (and that the caller passed one).
   *
   * @param value - The caller's failure, or `undefined` to clear the error UI.
   */
  set submitError(value: ReactFormProps['submitError']) {
    this.controlled = true
    this.controlledError = value
  }

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Serializes the form's inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return (
      this.automationId ??
      this.dataMolId ??
      this.host.nativeElement.getAttribute('data-mol-id') ??
      undefined
    )
  }

  /**
   * The error messages to announce (React's `submitError`/`failure` branch).
   * @returns The messages.
   */
  messages(): string[] {
    // React's `Object.hasOwn(props, 'submitError')` branch: once the caller
    // binds the input, it owns the error UI — an explicitly-undefined value
    // clears the list instead of falling back to a captured failure.
    const failure = this.controlled
      ? this.controlledError === undefined
        ? null
        : { error: this.controlledError }
      : this.failure()
    if (!failure) return []
    return formSubmitErrorMessages(
      failure.error,
      this.i18n.t('ui.form.submitError', undefined, {
        defaultValue: 'Unable to submit. Please try again.',
      }),
    )
  }

  /**
   * Handles a submit event: collects `FormData` for `onFormSubmit`, calls
   * both handlers, and tracks failure/pending (React's `handleSubmit`).
   *
   * @param event - The submit event.
   */
  async handleSubmit(event: Event): Promise<void> {
    if (!this.onFormSubmit && !this.onSubmit) return
    const current = ++this.attempt
    this.failure.set(null)
    this.pending.set(true)
    try {
      const submissions: Promise<void>[] = []
      const call = (handler: () => void | Promise<void>): void => {
        try {
          submissions.push(Promise.resolve(handler()))
        } catch (error) {
          submissions.push(Promise.reject(error))
        }
      }
      const form = event.currentTarget instanceof HTMLFormElement ? event.currentTarget : null
      if (this.onFormSubmit) {
        event.preventDefault()
        const entries = Array.from(new FormData(form ?? undefined))
        // `Object.fromEntries` defines every name as an own key: a repeated name
        // keeps its last value, and `__proto__` stays an ordinary field instead
        // of replacing the object's prototype.
        const data: Record<string, unknown> = Object.fromEntries(entries)
        // React reads `process.env.NODE_ENV`; Angular's CLI defines no such
        // global, and `isDevMode()` is false in its optimized (production) builds.
        if (isDevMode() && Object.keys(data).length < entries.length) {
          console.error(
            "Form.onFormSubmit received repeated field names and keeps only their last values. Use the form's onSubmit handler for repeated entries.",
          )
        }
        call(() => this.onFormSubmit?.(data))
      }
      call(() => this.onSubmit?.(event))
      await Promise.all(submissions)
    } catch (error) {
      if (this.attempt === current) this.failure.set({ error })
    } finally {
      if (this.attempt === current) this.pending.set(false)
    }
  }

  /**
   * Calls the reset handler (React's `onReset` through the rest spread).
   *
   * @param event - The reset event.
   */
  handleReset(event: Event): void {
    this.onReset?.(event)
  }
}
