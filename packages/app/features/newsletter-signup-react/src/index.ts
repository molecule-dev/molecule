/**
 * Email subscribe form.
 *
 * Exports `<NewsletterSignup>` with inline + stacked layouts. Tracks its
 * own submitting / error / success state; the app owns the subscription
 * side-effect via `onSubscribe`.
 *
 * @example
 * ```tsx
 * import { NewsletterSignup } from '@molecule/app-newsletter-signup-react'
 *
 * declare const api: { subscribe: (email: string) => Promise<void> }
 *
 * <NewsletterSignup
 *   title="Stay in the loop"
 *   description="Get weekly updates delivered to your inbox."
 *   onSubscribe={async (email) => { await api.subscribe(email) }}
 *   layout="inline"
 *   successContent={<p>Thanks for subscribing!</p>}
 * />
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and a React `I18nProvider` ancestor —
 * `getClassMap()` and `useTranslation()` both throw before wiring.
 * Pair with `@molecule/app-locales-newsletter-signup` for the
 * placeholder / button strings in 79 languages.
 *
 * ALWAYS pass `successContent` — without it a successful submit only
 * clears the input and re-renders the empty form (no built-in "thanks"
 * message). Return a Promise from `onSubscribe` so double-submits are
 * blocked while in flight; a rejected Promise renders the error's
 * `message` verbatim below the form, so throw user-readable (ideally
 * pre-translated) messages.
 *
 * @module
 */

export * from './NewsletterSignup.js'
