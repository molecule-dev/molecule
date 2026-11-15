/**
 * Types of `@molecule/app-contact-form-angular` — the Angular counterpart of
 * `@molecule/app-contact-form-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Shape of values collected by the contact form and passed to `onSubmit`. */
export interface ContactFormValues {
  name: string
  email: string
  message: string
  /** App-supplied additional fields. */
  [key: string]: string
}

/**
 * Props accepted by {@link ContactForm} — the same props
 * `@molecule/app-contact-form-react` accepts. Node props (`title`,
 * `description`, `submitLabel`, `successContent`) are `TemplateRef`s (or plain
 * strings) in Angular; `title`, `description` and `extraFields` may also be
 * projected as `[slot=title]`, `[slot=description]` and `[slot=extraFields]`
 * content.
 */
export interface ContactFormProps {
  /** Called with the form values on submit. Return a Promise to block double-submit. */
  onSubmit: (values: ContactFormValues) => void | Promise<void>
  /** Form heading. */
  title?: TemplateRef<unknown> | string | null
  /** Optional supporting copy under the heading. */
  description?: TemplateRef<unknown> | string | null
  /** Custom submit-button label. */
  submitLabel?: TemplateRef<unknown> | string | null
  /** Rendered when the form successfully submits. */
  successContent?: TemplateRef<unknown> | string | null
  /** Extra fields rendered above the message textarea. */
  extraFields?: TemplateRef<unknown> | string | null
  /** Extra classes. */
  className?: string
}
