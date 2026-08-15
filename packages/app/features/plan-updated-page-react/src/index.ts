/**
 * `<PlanUpdated />` — post-purchase confirmation page.
 *
 * Renders a thank-you headline + Return Home button after the user
 * completes a plan upgrade. Reads auth state to show a spinner while
 * the session is still hydrating, so the page is safe to navigate to
 * directly from a webhook redirect or fresh page load.
 *
 * **It also completes the purchase.** A hosted checkout returns the buyer
 * here with the payment id in the query
 * (`/plan-updated?provider=stripe&sessionId=…`), and this page confirms it
 * with `POST /users/:id/verify-payment/:provider` — a same-origin call, so
 * the session cookie applies. Route it at the path your API's
 * `PAYMENTS_PLAN_UPDATED_PATH` points to (default `/plan-updated`) and the
 * upgrade completes on the redirect instead of waiting on a webhook.
 *
 * Replaces the byte-identical `pages/PlanUpdated.tsx` shipped by 76 of
 * the 115 flagship apps that have a paid-plan flow. Translation keys
 * come from `@molecule/app-locales-common` plus one key from the
 * companion bond `@molecule/app-locales-plan-updated-page` (see
 * remarks).
 *
 * @example
 * ```tsx
 * import { Route } from 'react-router'
 * import { PlanUpdated } from '@molecule/app-plan-updated-page-react'
 *
 * <Route path="/plan-updated" element={<PlanUpdated />} />
 * ```
 *
 * @remarks
 * Requires react-router-dom (renders `<Link>`, so it must sit inside your
 * Router) and the `@molecule/app-react` auth provider (`useAuth` drives the
 * hydration spinner, `useVerifyPaymentReturn` the confirmation call).
 * Never point a provider's `success_url` straight at the API's
 * `/api/users/:id/verify-payment/:provider`: that top-level redirect crosses
 * to a host the session cookie is not set for, so it answers 401 and the paid
 * plan is never granted — send the buyer to THIS page instead. While the
 * confirmation is in flight the page shows the spinner; if it fails it shows a
 * retry (`data-mol-id="plan-updated-retry"`) rather than a false thank-you.
 * Pass `verify={false}` only if some other path grants the plan. Keys `planUpdated.message` / `planUpdated.thankYou` /
 * `planUpdated.returnHome` come from `@molecule/app-locales-common`; the
 * "View receipt" link uses `planUpdated.viewReceipt` from the companion bond
 * `@molecule/app-locales-plan-updated-page` and always navigates to
 * `/billing` — ensure that route exists. For the pricing-page-integrated
 * variant see `PlanUpdatedPage` in `@molecule/app-pricing-page-react` (a
 * same-named `PlanUpdatedPage` is also exported by
 * `@molecule/app-legal-pages-react`) — import the one whose kit you are using.
 *
 * @module
 */

export * from './PlanUpdated.js'
