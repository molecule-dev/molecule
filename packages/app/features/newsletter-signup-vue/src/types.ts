/**
 * Types for the Vue email subscribe form.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for {@link NewsletterSignup} — the same props (React names) as `@molecule/app-newsletter-signup-react`. */
export interface NewsletterSignupProps {
  /** Called with the email on submit. Return a Promise to block double-submit. */
  onSubscribe: (email: string) => void | Promise<void>
  /** Optional title above the form. Passed as a prop or as the same-named slot. */
  title?: VNodeChild
  /** Optional supporting copy under the title. Passed as a prop or as the same-named slot. */
  description?: VNodeChild
  /** Placeholder for the email input. */
  placeholder?: string
  /** Submit-button label. Passed as a prop or as the same-named slot. */
  buttonLabel?: VNodeChild
  /** Rendered after successful subscription. Passed as a prop or as the same-named slot. */
  successContent?: VNodeChild
  /** Layout — `'inline'` default (input + button on one row) or `'stacked'`. */
  layout?: 'inline' | 'stacked'
  /** Extra classes. */
  className?: string
}
