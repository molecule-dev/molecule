/**
 * `<PlanUpdated />` — post-purchase confirmation page.
 *
 * Renders a thank-you headline + Return Home button after the user
 * completes a plan upgrade. Reads auth state to show a spinner while
 * the session is still hydrating, so the page is safe to navigate to
 * directly from a webhook redirect or fresh page load.
 *
 * Replaces the byte-identical `pages/PlanUpdated.tsx` shipped by 76 of
 * the 115 flagship apps that have a paid-plan flow. Translation keys
 * come from `@molecule/app-locales-common` plus one key from the
 * companion bond `@molecule/app-locales-plan-updated-page` (see
 * remarks).
 *
 * @example
 * ```tsx
 * import { Route } from 'react-router-dom'
 * import { PlanUpdated } from '@molecule/app-plan-updated-page-react'
 *
 * <Route path="/plan-updated" element={<PlanUpdated />} />
 * ```
 *
 * @remarks
 * Requires react-router-dom (renders `<Link>`, so it must sit inside your
 * Router) and the `@molecule/app-react` auth provider (`useAuth` drives the
 * hydration spinner). Keys `planUpdated.message` / `planUpdated.thankYou` /
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
