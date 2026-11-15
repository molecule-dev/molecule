/**
 * Types for the Solid contact form.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Shape of values collected by the contact form and passed to `onSubmit`. */
export interface ContactFormValues {
  name: string
  email: string
  message: string
  /** App-supplied additional fields. */
  [key: string]: string
}

/** Props accepted by the {@link ContactForm} component. */
export interface ContactFormProps {
  /** Called with the form values on submit. Return a Promise to block double-submit. */
  onSubmit: (values: ContactFormValues) => void | Promise<void>
  /** Form heading. */
  title?: JSX.Element
  /** Optional supporting copy under the heading. */
  description?: JSX.Element
  /** Custom submit-button label. */
  submitLabel?: JSX.Element
  /** Rendered when the form successfully submits. */
  successContent?: JSX.Element
  /** Extra fields rendered above the message textarea. */
  extraFields?: JSX.Element
  /** Extra classes. */
  className?: string
}
