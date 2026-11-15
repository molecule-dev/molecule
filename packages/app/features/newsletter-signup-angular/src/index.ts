/**
 * Angular email subscribe form — the counterpart of
 * `@molecule/app-newsletter-signup-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<NewsletterSignup>` with inline + stacked layouts. It tracks its own
 * submitting / error / success state; the app owns the subscription
 * side-effect via the `onSubscribe` input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { NewsletterSignup } from '@molecule/app-newsletter-signup-angular'
 *
 * @Component({
 *   selector: 'app-subscribe',
 *   standalone: true,
 *   imports: [NewsletterSignup],
 *   template: `
 *     <mol-newsletter-signup
 *       title="Stay in the loop"
 *       description="Get weekly updates delivered to your inbox."
 *       layout="inline"
 *       [onSubscribe]="subscribe"
 *     >
 *       <ng-template>Thanks for subscribing!</ng-template>
 *     </mol-newsletter-signup>
 *   `,
 * })
 * export class Subscribe {
 *   subscribe = (email: string): Promise<void> => api.subscribe(email)
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and `@molecule/app-angular`'s i18n provider
 * above it — `getClassMap()` and `useTranslation()` both throw before wiring.
 * Pair with `@molecule/app-locales-newsletter-signup` for the placeholder /
 * button strings in 79 languages.
 *
 * ALWAYS pass `successContent` — without it a successful submit only clears
 * the input and re-renders the empty form (no built-in "thanks" message).
 * Return a Promise from `onSubscribe` so double-submits are blocked while in
 * flight; a rejected Promise renders the error's `message` verbatim below the
 * form, so throw user-readable (ideally pre-translated) messages.
 *
 * @module
 */

export * from './newsletter-signup.component.js'
export * from './types.js'
