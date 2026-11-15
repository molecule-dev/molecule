/**
 * Types for the Vue contact form.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

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
  /** Form heading. Passed as a prop or as the same-named slot — both work. */
  title?: VNodeChild
  /** Optional supporting copy under the heading (prop or same-named slot). */
  description?: VNodeChild
  /** Custom submit-button label (prop or same-named slot). */
  submitLabel?: VNodeChild
  /** Rendered when the form successfully submits (prop or same-named slot). */
  successContent?: VNodeChild
  /** Extra fields rendered above the message textarea (prop or same-named slot). */
  extraFields?: VNodeChild
  /** Extra classes. */
  className?: string
}
