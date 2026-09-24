/**
 * Saved payment-method resource for molecule.dev.
 *
 * Wraps the Stripe SetupIntent flow (and any future card-style provider) into
 * a database-backed list of saved payment methods with a per-user default.
 *
 * @module
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { bond } from '@molecule/api-bond'
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { paymentProvider } from '@molecule/api-payments-stripe'
 * import {
 *   attachPaymentMethod,
 *   requestHandlerMap as PaymentMethods,
 * } from '@molecule/api-resource-payment-method'
 *
 * // Startup: bond the DataStore (reads DATABASE_URL) and Stripe under the NAME 'stripe'
 * // (reads STRIPE_SECRET_KEY) — a singleton bond('payments', provider) is NOT found.
 * setStore(store)
 * bond('payments', 'stripe', paymentProvider)
 *
 * // What `mlcl inject` generates from `routes`, mounted AFTER the global auth middleware
 * // (it sets res.locals.session; without it every route answers 401):
 * export const router = express.Router()
 * router.post('/me/payment-methods/setup-intent', PaymentMethods.createSetupIntent) // → { clientSecret, ... }
 * router.get('/me/payment-methods', PaymentMethods.listPaymentMethods)
 * router.put('/me/payment-methods/:id/default', PaymentMethods.setDefaultPaymentMethod)
 * router.delete('/me/payment-methods/:id', PaymentMethods.deletePaymentMethod)
 *
 * // NO attach route ships — add one for the client to call after stripe.confirmCardSetup():
 * router.post('/me/payment-methods', async (req, res) => {
 *   const userId = res.locals.session?.userId as string | undefined
 *   if (!userId) return void res.status(401).end()
 *   const method = await attachPaymentMethod(userId, String(req.body.paymentMethodId)) // 'pm_…'
 *   res.status(201).json(method) // { brand, last4, expMonth, expYear, isDefault, ... }
 * })
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
 * **There is no route for `attachPaymentMethod`** — the shipped `routes` only
 * create the SetupIntent, list, set-default and delete. Add your own POST (as
 * above) or saved cards never appear. The first attached card becomes the
 * default automatically.
 *
 * The customer id returned by `createSetupIntent` is NOT persisted by it; the
 * first `attachPaymentMethod` stores `providerCustomerId: ''` (a warning is
 * logged) because it only copies the id from earlier rows. If you need the
 * customer id later (off-session charges), store it yourself from the
 * setup-intent response.
 *
 * `deletePaymentMethod` removes the row even when the provider detach fails
 * (logged). Deleting the default card does NOT promote another one.
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
