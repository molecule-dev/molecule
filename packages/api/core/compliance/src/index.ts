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
 * import { setProvider, exportUserData, deleteUserData, getConsent, setConsent } from '@molecule/api-compliance'
 * import { provider } from '@molecule/api-compliance-gdpr'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Export user data for a data portability request
 * const exportData = await exportUserData('user-123', 'json')
 *
 * // Handle a deletion request (right to erasure)
 * const result = await deleteUserData('user-123', { retainLegalObligations: true })
 *
 * // Manage user consent
 * await setConsent('user-123', { purpose: 'marketing', granted: false })
 * const consent = await getConsent('user-123')
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
