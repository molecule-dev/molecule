/**
 * Types for the Svelte email subscribe form.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props for {@link NewsletterSignup} — the same props (React names) as `@molecule/app-newsletter-signup-react`. */
export interface NewsletterSignupProps {
  /** Called with the email on submit. Return a Promise to block double-submit. */
  onSubscribe: (email: string) => void | Promise<void>
  /** Optional title above the form — a snippet or a plain string. */
  title?: Snippet | string
  /** Optional supporting copy under the title — a snippet or a plain string. */
  description?: Snippet | string
  /** Placeholder for the email input. */
  placeholder?: string
  /** Submit-button label — a snippet or a plain string. */
  buttonLabel?: Snippet | string
  /** Rendered after successful subscription — a snippet or a plain string. */
  successContent?: Snippet | string
  /** Layout — `'inline'` default (input + button on one row) or `'stacked'`. */
  layout?: 'inline' | 'stacked'
  /** Extra classes. */
  className?: string
}
