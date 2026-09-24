/**
 * Compliance core interface for molecule.dev.
 *
 * Provides the `ComplianceProvider` interface for GDPR and data compliance
 * operations including user data export, deletion, consent management,
 * and data processing logs. Bond a concrete provider
 * (e.g. `@molecule/api-compliance-gdpr`) at startup via `setProvider()`.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   deleteUserData,
 *   exportUserData,
 *   getConsent,
 *   setConsent,
 *   setProvider,
 * } from '@molecule/api-compliance'
 * import { createProvider } from '@molecule/api-compliance-gdpr'
 *
 * // Your real data source — in an app this is your DataStore/table.
 * const profiles = new Map([['user-123', { name: 'Ada', email: 'ada@example.com' }]])
 *
 * // Startup: register one collector per category you manage (collect = export, delete = erase).
 * setProvider(
 *   createProvider({
 *     legalObligationCategories: ['billing'],
 *     dataCollectors: [
 *       {
 *         category: 'profile',
 *         collect: async (userId) => profiles.get(userId) ?? null,
 *         delete: async (userId) => {
 *           profiles.delete(userId)
 *         },
 *       },
 *     ],
 *   }),
 * )
 *
 * // userId comes from the AUTHENTICATED session, never from the request body.
 * const userId = 'user-123'
 * await setConsent(userId, { purpose: 'marketing', granted: false })
 * const consent = await getConsent(userId) // consents: [{ purpose: 'marketing', granted: false, ... }]
 *
 * const exported = await exportUserData(userId, 'json') // exported.data.profile → { name: 'Ada', ... }
 *
 * const result = await deleteUserData(userId, { categories: ['profile', 'billing'] })
 * // result.status === 'completed', deletedCategories ['profile'], retainedCategories ['billing']
 * ```
 *
 * @remarks
 * Compliance endpoints are attack surface — the rules a generator gets wrong:
 *
 * - **Act on the AUTHENTICATED user's id, never a client-supplied one.** An
 *   endpoint that exports or deletes data for whatever `userId` the request
 *   names lets any user exfiltrate or erase another user's data. Derive the id
 *   from the session; an admin-facing variant needs an explicit admin
 *   authorizer.
 * - **Deletion is destructive — gate it.** Require an explicit confirmation
 *   step in the UI (there is no undo), check `DeletionResult.status`
 *   (`'partial'` and `'failed'` are real outcomes), and surface retained
 *   categories (`retainLegalObligations`) instead of claiming everything was
 *   deleted.
 * - **Enforce consent SERVER-SIDE.** Before running consent-scoped processing
 *   (marketing sends, analytics), check `getConsent()` in the handler/job that
 *   does the processing — a client-side flag is not consent enforcement.
 * - Wire the provider once at startup (`setProvider(provider)` in the app's
 *   bond setup); every convenience function throws until then.
 * - **The GDPR bond only exports/erases what your `dataCollectors` cover.** With no
 *   collectors, `exportUserData()` returns no user data (only consents) and
 *   `deleteUserData()` returns `'failed'` — it never reaches your database on its own.
 * - `deleteUserData()` retains legal-obligation categories (default `['billing']`) unless
 *   `retainLegalObligations: false`; read `retainedCategories`, don't assume a full wipe.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A logged-in user can export their own data from the UI and the export
 *   contains their data — and only theirs.
 * - [ ] Requesting an export or deletion for a DIFFERENT user's id (e.g. by
 *   editing the request) is rejected server-side — not merely hidden in the UI.
 * - [ ] The deletion flow requires an explicit confirmation, completes, and the
 *   user's content is gone after a full reload; any retained categories are
 *   stated in the UI.
 * - [ ] Toggling a consent purpose off persists (survives reload) and the
 *   consent-scoped behavior actually stops.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
