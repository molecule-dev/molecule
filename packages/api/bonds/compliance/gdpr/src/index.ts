/**
 * GDPR compliance provider for molecule.dev.
 *
 * Implements the `ComplianceProvider` interface with in-memory storage
 * for consent records, processing logs, and data export/deletion
 * bookkeeping. Supports configurable data collectors, legal obligation
 * retention, and data category filtering for GDPR Article 15–20 compliance.
 *
 * @remarks
 * - **This provider is the compliance BOOKKEEPING layer — it does not touch
 *   your data stores.** `deleteUserData()` records which categories were
 *   requested/retained and returns `status: 'completed'`, but performs NO
 *   actual deletion anywhere: `DataCollector` only has `collect()` (used by
 *   `exportUserData()`), and there is no deletion hook. Your handler must
 *   itself delete the user's rows/files for the returned `deletedCategories`
 *   (e.g. via `@molecule/api-database`) after calling `deleteUserData()`.
 * - **`exportUserData()` returns an empty `data` object unless you register
 *   `dataCollectors`** — one per data category, each returning that user's
 *   data from your real sources. Without them the export contains only
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
 *     { category: 'profile', collect: async (userId) => findOne('users', { id: userId }) },
 *   ],
 * }))
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
