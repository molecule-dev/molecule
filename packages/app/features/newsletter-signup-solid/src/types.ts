/**
 * Types for the Solid email subscribe form.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for {@link NewsletterSignup} — the same props (React names) as `@molecule/app-newsletter-signup-react`. */
export interface NewsletterSignupProps {
  /** Called with the email on submit. Return a Promise to block double-submit. */
  onSubscribe: (email: string) => void | Promise<void>
  /** Optional title above the form. */
  title?: JSX.Element
  /** Optional supporting copy under the title. */
  description?: JSX.Element
  /** Placeholder for the email input. */
  placeholder?: string
  /** Submit-button label. */
  buttonLabel?: JSX.Element
  /** Rendered after successful subscription. */
  successContent?: JSX.Element
  /** Layout — `'inline'` default (input + button on one row) or `'stacked'`. */
  layout?: 'inline' | 'stacked'
  /** Extra classes. */
  className?: string
}
