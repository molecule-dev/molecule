/**
 * Vue email subscribe form.
 *
 * Exports `<NewsletterSignup>` with inline + stacked layouts. Tracks its own
 * submitting / error / success state; the app owns the subscription
 * side-effect via `onSubscribe`. It is the Vue counterpart of
 * `@molecule/app-newsletter-signup-react`: same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { NewsletterSignup } from '@molecule/app-newsletter-signup-vue'
 *
 * const Subscribe = defineComponent({
 *   setup() {
 *     const subscribe = async (email: string): Promise<void> => {
 *       await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) })
 *     }
 *     return () =>
 *       h(
 *         NewsletterSignup,
 *         {
 *           title: 'Stay in the loop',
 *           description: 'Get weekly updates delivered to your inbox.',
 *           layout: 'inline',
 *           onSubscribe: subscribe,
 *         },
 *         { successContent: () => [h('p', 'Thanks for subscribing!')] },
 *       )
 *   },
 * })
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and the Vue binding's i18n provider above it
 * — `getClassMap()` and `useTranslation()` both throw before wiring. Pair with
 * `@molecule/app-locales-newsletter-signup` for the placeholder / button
 * strings in 79 languages.
 *
 * ALWAYS pass `successContent` — without it a successful submit only clears
 * the input and re-renders the empty form (no built-in "thanks" message).
 * Return a Promise from `onSubscribe` so double-submits are blocked while in
 * flight; a rejected Promise renders the error's `message` verbatim below the
 * form, so throw user-readable (ideally pre-translated) messages. Node-valued
 * props arrive as a prop AND a same-named slot; components accept either.
 *
 * @module
 */

export * from './NewsletterSignup.js'
export * from './types.js'
