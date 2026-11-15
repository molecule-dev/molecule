/**
 * Types for the Svelte contact form.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Shape of values collected by the contact form and passed to `onSubmit`. */
export interface ContactFormValues {
  name: string
  email: string
  message: string
  /** App-supplied additional fields. */
  [key: string]: string
}

/** Props for {@link ContactForm} — the same props (React names) as `@molecule/app-contact-form-react`. */
export interface ContactFormProps {
  /** Called with the form values on submit. Return a Promise to block double-submit. */
  onSubmit: (values: ContactFormValues) => void | Promise<void>
  /** Form heading — a snippet or a plain string. */
  title?: Snippet | string
  /** Optional supporting copy under the heading — a snippet or a plain string. */
  description?: Snippet | string
  /** Custom submit-button label — a snippet or a plain string. */
  submitLabel?: Snippet | string
  /** Rendered when the form successfully submits — a snippet or a plain string. */
  successContent?: Snippet | string
  /** Extra fields rendered above the message textarea — a snippet or a plain string. */
  extraFields?: Snippet | string
  /** Extra classes. */
  className?: string
}
