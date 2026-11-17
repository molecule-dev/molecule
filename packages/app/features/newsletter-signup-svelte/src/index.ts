/**
 * Svelte email subscribe form — the Svelte counterpart of
 * `@molecule/app-newsletter-signup-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports `NewsletterSignup` — email field + subscribe button with inline /
 * stacked layouts. It tracks its own submitting / error / success state; the
 * app owns the subscription side-effect via `onSubscribe`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { NewsletterSignup } from '@molecule/app-newsletter-signup-svelte'
 *
 *   async function subscribe(email: string): Promise<void> {
 *     await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) })
 *   }
 * </script>
 *
 * <NewsletterSignup
 *   title="Stay in the loop"
 *   description="Get weekly updates delivered to your inbox."
 *   layout="inline"
 *   onSubscribe={subscribe}
 * >
 *   {#snippet successContent()}
 *     <p>Thanks for subscribing!</p>
 *   {/snippet}
 * </NewsletterSignup>
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and `@molecule/app-svelte`'s i18n provider
 * above it — `getClassMap()` and `useTranslation()` both throw before wiring.
 * Pair with `@molecule/app-locales-newsletter-signup` for the placeholder /
 * button / label / error strings in 79 languages.
 *
 * ALWAYS pass `successContent` — without it a successful submit only clears
 * the input and re-renders the empty form (no built-in "thanks" message).
 * Return a Promise from `onSubscribe` so double-submits are blocked while in
 * flight; a rejected Promise renders the error's `message` verbatim below the
 * form, so throw user-readable (ideally pre-translated) messages.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
