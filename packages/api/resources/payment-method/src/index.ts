/**
 * Saved payment-method resource for molecule.dev.
 *
 * Wraps the Stripe SetupIntent flow (and any future card-style provider) into
 * a database-backed list of saved payment methods with a per-user default.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-payment-method'
 *
 * // Mount via mlcl-generated router; service-level usage:
 * import {
 *   createSetupIntent,
 *   attachPaymentMethod,
 *   listPaymentMethods,
 *   setDefaultPaymentMethod,
 *   deletePaymentMethod,
 * } from '@molecule/api-resource-payment-method'
 * ```
 *
 * @remarks
 * Bond ordering: the service resolves the provider with
 * `get('payments', 'stripe')` — wire `@molecule/api-payments-stripe` under the
 * name `stripe` (`bond('payments', 'stripe', provider)`) BEFORE any route
 * runs, and set `STRIPE_SECRET_KEY`. The provider name is currently fixed
 * (`PROVIDER_NAME = 'stripe'`); other card-style providers plug in by
 * implementing the same SetupIntent-shaped `PaymentProvider` surface.
 *
 * Table: `src/__setup__/payment_methods.sql` creates `payment_methods`. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once.
 *
 * All routes are SELF-scoped under `/me/payment-methods` and read the
 * authenticated user from `res.locals.session` (401 without a session) — a
 * user can only list/attach/default/delete their OWN methods; never accept a
 * target userId from the client. Raw card data never touches your API: the
 * client confirms the SetupIntent with the provider and only the provider's
 * payment-method id is attached and stored.
 *
 * @e2e
 * SECURITY / PCI-critical verification — drive the real UI (live preview, no
 * mocks) and adapt each item to this app's actual card screens. Check every
 * box off one by one; a box you can't check is a security bug to fix, not a
 * skip. NEVER type a real card number anywhere — use the provider's TEST card
 * (Stripe test mode, `4242 4242 4242 4242`), and it must go to the provider
 * SDK, never to your API:
 * - [ ] Adding a card via the SetupIntent flow stores only a provider TOKEN
 *   (`providerPaymentMethodId` like `pm_…`, `providerCustomerId` like `cus_…`)
 *   plus safe display fields (`brand`, `last4`, `expMonth`, `expYear`). Confirm
 *   with `GET /me/payment-methods` that the response — and the `payment_methods`
 *   table schema — carry NO full card number (PAN) and NO CVV: the raw PAN/CVV
 *   must appear NOWHERE in the DB row, the API response, or the server logs.
 * - [ ] The UI shows only the masked card (`brand` + `•••• 4242`) — never the
 *   full number and never the CVV.
 * - [ ] Setting a default makes exactly ONE default: the first card added is
 *   auto-default; promoting a second card flips the old default's `isDefault`
 *   to false, so only one method has `isDefault: true` (a partial unique index
 *   enforces this at the DB level).
 * - [ ] Removing a method deletes it (`DELETE /me/payment-methods/:id` → 204,
 *   gone from the list) AND detaches it at the provider, so it can no longer be
 *   charged.
 * - [ ] AUTHORIZATION — every route is `/me/…`-scoped to the session user: a
 *   user lists/adds/defaults/deletes only their OWN methods. Guessing another
 *   user's payment-method id into `PUT /me/payment-methods/:id/default` or
 *   `DELETE /me/payment-methods/:id` returns 404 (never touches their card),
 *   and no endpoint accepts a target userId from the client.
 * - [ ] The provider secret (`STRIPE_SECRET_KEY`) stays server-side only —
 *   never shipped to the browser bundle (this package is server-only). The card
 *   is tokenized client-side by the provider SDK using the SetupIntent client
 *   secret, so the raw card never touches your server.
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './secrets.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
