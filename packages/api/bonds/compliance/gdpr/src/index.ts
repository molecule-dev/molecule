/**
 * GDPR compliance provider for molecule.dev.
 *
 * Implements the `ComplianceProvider` interface with in-memory storage
 * for consent records, processing logs, and data export/deletion
 * bookkeeping. Supports configurable data collectors, legal obligation
 * retention, and data category filtering for GDPR Article 15–20 compliance.
 *
 * @remarks
 * - **Erasure runs through your `DataCollector.delete` hooks.**
 *   `deleteUserData()` calls the optional `delete(userId)` on every registered
 *   collector whose category is being erased, and returns `status: 'completed'`
 *   only when every requested (non-legally-retained) category was actually
 *   erased. A category with no delete-capable collector is left in place and
 *   reported as skipped — the result comes back `'partial'` (some erased) or
 *   `'failed'` (none erased), never a false `'completed'`. So register a
 *   `delete`-capable collector per category you manage; a `collect`-only
 *   collector still exports but does NOT erase.
 * - **`exportUserData()` returns an empty `data` object unless you register
 *   `dataCollectors`** — one per data category, each `collect()` returning that
 *   user's data from your real sources. Without them the export contains only
 *   in-memory consent entries.
 * - **All state is in process memory.** Consent records, processing logs, and
 *   deletion receipts are lost on restart and are not shared across
 *   instances. Persist consent changes in your own database if you need a
 *   durable Art. 7 / Art. 30 trail.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, exportUserData, deleteUserData, getConsent, setConsent } from '@molecule/api-compliance'
 * import { createProvider } from '@molecule/api-compliance-gdpr'
 *
 * setProvider(createProvider({
 *   legalObligationCategories: ['billing', 'authentication'],
 *   dataCollectors: [
 *     {
 *       category: 'profile',
 *       collect: async (userId) => findOne('users', { id: userId }),
 *       delete: async (userId) => { await deleteById('users', userId) },
 *     },
 *   ],
 * }))
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
