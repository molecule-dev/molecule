/**
 * Address resource for molecule.dev.
 *
 * Per-user saved shipping/billing addresses with default flag, country-aware
 * fields, and validation. Drop-in replacement for the per-app `addresses`
 * tables currently duplicated across e-commerce flagships (food-delivery,
 * grocery-delivery, multi-vendor-marketplace, online-store, subscription-box).
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-address'
 *
 * // Wire routes into your Express app via mlcl inject:
 * // POST   /addresses
 * // GET    /addresses
 * // GET    /addresses/:id
 * // PATCH  /addresses/:id
 * // POST   /addresses/:id/default     { kind: 'shipping' | 'billing' }
 * // DELETE /addresses/:id
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/addresses.sql` ships with this package
 *   and must exist in the target database before use (scaffolded apps apply it
 *   automatically; existing apps must apply it first).
 * - **Owner-scoped via the session.** All routes require `authenticate` and the
 *   service filters every read/write by the session `userId` — never accept a
 *   `userId` from the client and never look an address up by `:id` alone (IDOR).
 * - **Default flags are per-kind and exclusive.** Creating/updating with
 *   `isDefaultShipping`/`isDefaultBilling`, or `POST /addresses/:id/default`
 *   with `{ kind: 'shipping' | 'billing' }`, atomically clears the previous
 *   default of that kind for the user — don't hand-roll default toggling.
 * - Validation is shape-level and country-aware, not postal verification — treat
 *   address correctness as user-owned data; deliverability checks (if needed)
 *   are your app's concern at checkout time.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Adding an address from the UI persists every field entered
 *   (recipientName, line1/line2, city, region, postalCode, countryIso, phone,
 *   label): reload the list and the saved address shows the exact values
 *   entered — nothing is silently dropped or stored blank.
 * - [ ] The new address then appears in the user's own address list
 *   (GET /addresses), with any default(s) sorted first.
 * - [ ] Shipping and billing defaults are independent and each exclusive:
 *   marking an address the default shipping (create/PATCH with
 *   isDefaultShipping, or POST /addresses/:id/default { kind: 'shipping' })
 *   leaves EXACTLY ONE default-shipping for the user and clears the previous
 *   one; the same holds separately for billing. After toggling, confirm
 *   exactly one address is flagged per kind.
 * - [ ] Wherever a default address is consumed (checkout, order form,
 *   invoicing), the user's current default for that kind is the pre-selected
 *   option — not the first row or a stale one.
 * - [ ] Editing an address (PATCH) reflects and persists in the list and DB;
 *   removing one (DELETE) drops it from both. Removing the default does NOT
 *   auto-promote a replacement — the user is left with no default of that
 *   kind until they set a new one (per this interface).
 * - [ ] Required-field / format validation is enforced at both UI and API:
 *   submitting without recipientName, line1, city, postalCode, or countryIso
 *   (or a countryIso that isn't a 2-letter code) is rejected with a clear,
 *   visible error and a 400 — never saved with blank/invalid fields.
 * - [ ] AUTHORIZATION — a user sees and edits only their OWN addresses: the
 *   list returns only the session user's rows, and guessing another user's
 *   address id on GET/PATCH/DELETE or /:id/default returns not-found (404),
 *   never another user's data. The owner is always the authenticated session
 *   userId — a userId in the request body is ignored, never trusted.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
