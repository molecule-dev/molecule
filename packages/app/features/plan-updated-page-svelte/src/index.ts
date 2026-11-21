/**
 * Svelte post-purchase confirmation page — the Svelte counterpart of
 * `@molecule/app-plan-updated-page-react`, with the same props (React names)
 * and the same DOM for the same input.
 *
 * Exports `PlanUpdated` — a thank-you headline plus a Return Home button,
 * rendered after the user completes a plan upgrade. It reads auth state to
 * show a spinner while the session is still hydrating, so the page is safe to
 * navigate to directly from a webhook redirect or a fresh page load.
 *
 * **It also completes the purchase.** A hosted checkout returns the buyer
 * here with the payment id in the query
 * (`/plan-updated?provider=stripe&sessionId=…`), and this page confirms it
 * with `POST /users/:id/verify-payment/:provider` — a same-origin call, so
 * the session cookie applies. Route it at the path your API's
 * `PAYMENTS_PLAN_UPDATED_PATH` points to (default `/plan-updated`) and the
 * upgrade completes on the redirect instead of waiting on a webhook.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { PlanUpdated } from '@molecule/app-plan-updated-page-svelte'
 * </script>
 *
 * <PlanUpdated actionHref="/dashboard" />
 * ```
 *
 * @remarks
 * Requires `setMoleculeContext` (`@molecule/app-svelte`) in the root layout
 * with the app's `auth` client, `i18n` provider and `router` (`useAuth`
 * drives the hydration spinner, `useVerifyPaymentReturn` the confirmation
 * call, and the page renders `Link`, so it must sit inside the app's router).
 * Never point a provider's `success_url` straight at the API's
 * `/api/users/:id/verify-payment/:provider`: that top-level redirect crosses
 * to a host the session cookie is not set for, so it answers 401 and the paid
 * plan is never granted — send the buyer to THIS page instead. While the
 * confirmation is in flight the page shows the spinner; if it fails it shows a
 * retry (`data-mol-id="plan-updated-retry"`) rather than a false thank-you.
 * Pass `verify={false}` only if some other path grants the plan. Keys
 * `planUpdated.message` / `planUpdated.thankYou` / `planUpdated.returnHome`
 * come from `@molecule/app-locales-common`; the "View receipt" link uses
 * `planUpdated.viewReceipt` from the companion bond
 * `@molecule/app-locales-plan-updated-page` and always navigates to
 * `/billing` — ensure that route exists.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
