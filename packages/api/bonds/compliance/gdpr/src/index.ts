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
 * - **`deleteUserData(userId)` with no `categories` erases EVERY configured category** (all
 *   eight by default). Any category without a `delete`-capable collector is skipped, so the
 *   result is `'partial'`/`'failed'` — set `categories` in `createProvider()` to exactly the ones
 *   you collect (as below) or pass `{ categories }` per call.
 * - `legalObligationCategories` defaults to `['billing']`: those are exported but RETAINED on
 *   erasure (`retainedCategories`) unless the call passes `retainLegalObligations: false`.
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-compliance`), not
 *   `bond('compliance-gdpr', ...)`. Collectors that use the `DataStore` need the database bond
 *   (`setStore`) wired first.
 *
 * @example
 * ```typescript
 * import { deleteUserData, exportUserData, setConsent, setProvider } from '@molecule/api-compliance'
 * import { createProvider } from '@molecule/api-compliance-gdpr'
 * import { deleteById, deleteMany, findMany, findOne, setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 *
 * // Startup: DataStore first (postgresql reads DATABASE_URL), then the compliance provider.
 * setStore(store)
 * const byUser = (field: string, userId: string) => [{ field, operator: '=' as const, value: userId }]
 * setProvider(
 *   createProvider({
 *     categories: ['profile', 'content', 'billing'], // exactly the categories you collect
 *     legalObligationCategories: ['billing'], // exported, but retained on erasure
 *     dataCollectors: [
 *       {
 *         category: 'profile',
 *         collect: (userId) => findOne('users', byUser('id', userId)),
 *         delete: async (userId) => void (await deleteById('users', userId)),
 *       },
 *       {
 *         category: 'content',
 *         collect: (userId) => findMany('posts', { where: byUser('authorId', userId) }),
 *         delete: async (userId) => void (await deleteMany('posts', byUser('authorId', userId))),
 *       },
 *       { category: 'billing', collect: (userId) => findMany('invoices', { where: byUser('userId', userId) }) },
 *     ],
 *   }),
 * )
 *
 * // userId comes from the AUTHENTICATED session, never from the request body.
 * const userId = 'user-123'
 * await setConsent(userId, { purpose: 'marketing', granted: false })
 * const exported = await exportUserData(userId, 'json') // data: { profile, content, billing, consents }
 * const erased = await deleteUserData(userId) // status 'completed', retainedCategories ['billing']
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
