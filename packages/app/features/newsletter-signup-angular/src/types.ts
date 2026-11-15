/**
 * Types of `@molecule/app-newsletter-signup-angular` — the Angular counterpart
 * of `@molecule/app-newsletter-signup-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Props accepted by {@link NewsletterSignup} — the same props
 * `@molecule/app-newsletter-signup-react` accepts. Node props (`title`,
 * `description`, `buttonLabel`, `successContent`) are `TemplateRef`s (or plain
 * strings) in Angular.
 */
export interface NewsletterSignupProps {
  /** Called with the email on submit. Return a Promise to block double-submit. */
  onSubscribe: (email: string) => void | Promise<void>
  /** Optional title above the form. */
  title?: TemplateRef<unknown> | string | null
  /** Optional supporting copy under the title. */
  description?: TemplateRef<unknown> | string | null
  /** Placeholder for the email input. */
  placeholder?: string
  /** Submit-button label. */
  buttonLabel?: TemplateRef<unknown> | string | null
  /** Rendered after successful subscription. */
  successContent?: TemplateRef<unknown> | string | null
  /** Layout — `'inline'` default (input + button on one row) or `'stacked'`. */
  layout?: 'inline' | 'stacked'
  /** Extra classes. */
  className?: string
}
