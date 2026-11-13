/**
 * Form component (React parity).
 *
 * @module
 */

import { Component, signal } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { formSubmitErrorMessages } from '../utilities/form-submit-error.js'
import { styleText } from '../utilities/style.js'

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
  ],
  host: {
    '[class]': 'className',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
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
export class Form {
  /** Collects the form's data on submit (React's `onFormSubmit`). */
  onFormSubmit?: (data: Record<string, unknown>) => void | Promise<void>
  /** Receives the submit event (React's `onSubmit`). */
  onSubmit?: (event: Event) => void | Promise<void>
  /** Receives the reset event (React's `onReset`). */
  onReset?: (event: Event) => void
  /** Whether the form is submitting (disables the fieldset). */
  submitting?: boolean
  /** A failure managed by an external form controller. */
  submitError?: unknown
  /** Native form action. */
  action?: string
  /** Native form method. */
  method?: string
  /** Whether native validation is disabled. */
  noValidate?: boolean
  /** Extra classes for the form. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string

  /** Whether a submit is in flight. */
  readonly pending = signal(false)
  /** The failure the last submit produced. */
  private readonly failure = signal<{ error: unknown } | null>(null)
  /** A submit counter: a later submit supersedes an earlier settling one. */
  private attempt = 0

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
   * The error messages to announce (React's `submitError`/`failure` branch).
   * @returns The messages.
   */
  messages(): string[] {
    // Angular has no "prop was passed" signal; an explicitly-present
    // `submitError` is the external-controller form, absent means the
    // component owns the failure (React's `Object.hasOwn(props, …)`).
    const error = this.submitError !== undefined ? { error: this.submitError } : this.failure()
    if (!error) return []
    return formSubmitErrorMessages(
      error.error,
      t('ui.form.submitError', undefined, {
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
      const form = event.currentTarget as HTMLFormElement | null
      if (this.onFormSubmit) {
        event.preventDefault()
        const formData = new FormData(form ?? undefined)
        const data: Record<string, unknown> = {}
        formData.forEach((value, key) => {
          data[key] = value
        })
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
