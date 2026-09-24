/**
 * Content moderation core interface for molecule.dev.
 *
 * Defines the abstract contract for AI-powered content moderation and
 * user report management. Bond a concrete provider (e.g., one backed
 * by `@molecule/api-ai`) to enable moderation in your application.
 *
 * @module
 * @example
 * ```typescript
 * import type { AIProvider } from '@molecule/api-ai'
 * import { requireProvider as requireAI } from '@molecule/api-ai'
 * import type {
 *   ContentModerationProvider,
 *   ModerationResult,
 *   Report,
 * } from '@molecule/api-content-moderation'
 * import { requireProvider, setProvider } from '@molecule/api-content-moderation'
 * import { count, create, findMany, updateById } from '@molecule/api-database'
 *
 * // No prebuilt bond: implement the provider in the app on top of the bonded AI provider
 * // (`@molecule/api-ai`) and the DataStore (`reports` table, migrated by the app).
 * const SYSTEM =
 *   'You are a content moderator. Reply ONLY with JSON: {"flagged": boolean, ' +
 *   '"categories": [{"category": string, "flagged": boolean, "score": number}]}'
 * async function classify(ai: AIProvider, content: string): Promise<ModerationResult> {
 *   let reply = ''
 *   const messages = [{ role: 'user' as const, content }]
 *   for await (const event of ai.chat({ system: SYSTEM, messages, maxTokens: 300 })) {
 *     if (event.type === 'text') reply += event.content
 *     if (event.type === 'error') throw new Error(event.message)
 *   }
 *   return JSON.parse(reply) as ModerationResult // untrusted model output — validate in production
 * }
 *
 * const moderation: ContentModerationProvider = {
 *   name: 'app-ai',
 *   check: (content) => classify(requireAI(), content),
 *   checkImage: async () => ({ flagged: false, categories: [] }), // no image model wired
 *   async report(input) {
 *     const now = new Date().toISOString()
 *     const id = crypto.randomUUID()
 *     const row: Report = { id, ...input, status: 'pending', createdAt: now, updatedAt: now }
 *     await create('reports', { ...row })
 *     return row
 *   },
 *   async getReports({ limit = 20, offset = 0, status = 'pending' } = {}) {
 *     const where = [{ field: 'status', operator: '=' as const, value: status }]
 *     const orderBy = [{ field: 'createdAt', direction: 'asc' as const }]
 *     const data = await findMany<Report>('reports', { where, limit, offset, orderBy })
 *     return { data, total: await count('reports', where), limit, offset }
 *   },
 *   async resolveReport(id, { action, reason, resolvedBy }) {
 *     const status = action === 'dismiss' ? 'dismissed' : 'resolved'
 *     const updatedAt = new Date().toISOString()
 *     await updateById('reports', id, { status, resolution: reason ?? action, resolvedBy, updatedAt })
 *   },
 * }
 *
 * // Startup: bond it (after the AI + database bonds).
 * setProvider(moderation)
 *
 * // Create/update handler: moderate SERVER-SIDE before persisting.
 * const result = await requireProvider().check('user-submitted comment text')
 * if (result.flagged) throw new Error('Comment rejected by moderation')
 * ```
 *
 * @remarks
 * - **There is no prebuilt bond for this category.** Implement
 *   `ContentModerationProvider` in the app — typically a thin object composing
 *   the app's bonded AI provider (`@molecule/api-ai`) for `check()`/`checkImage()`
 *   and the DataStore for reports — and `setProvider()` it at startup.
 * - **Unlike most cores, there are NO module-level convenience delegates.**
 *   Call methods on `requireProvider()` (throws when unbonded). Note
 *   `getProvider()` returns `null` rather than throwing — don't optional-chain
 *   into silently skipping moderation.
 * - **Moderate SERVER-SIDE, before persisting or publishing.** Run `check()`
 *   inside the create/update handler and block or quarantine flagged content
 *   there — a client-side check is decoration, not enforcement.
 * - **Choose the failure mode explicitly.** If the moderation call itself
 *   fails (AI backend down), decide fail-open (publish + log) or fail-closed
 *   (hold for review) per surface — don't let the exception 500 the request.
 * - **Report workflows are privileged.** `report()` is for authenticated end
 *   users; `getReports()` / `resolveReport()` power a moderator surface — gate
 *   those routes with an admin authorizer.
 * - Thresholds and category coverage are provider-specific — pass
 *   `ModerationOptions.threshold` / `categories` rather than assuming defaults.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Every surface that accepts user-generated content (post, comment,
 *   image upload, bio — whatever this app has) runs it through `check()` /
 *   `checkImage()` SERVER-SIDE in the create/update handler, before persisting.
 *   Confirm the moderation call is on the write path, not client-side or skipped.
 * - [ ] Assert BOTH directions with real samples: clearly-violating content
 *   returns `flagged: true` and the UI rejects it with a visible reason; benign
 *   content returns `flagged: false` and publishes normally. A moderator that
 *   flags everything or nothing is broken.
 * - [ ] The decision gates persistence: a blocked item is NOT stored and is
 *   absent when you view the feed as a second user. Tighten
 *   `ModerationOptions.threshold` and a borderline item flips allowed → blocked.
 * - [ ] The failure mode is deliberate: when the moderation/AI call errors the
 *   request does NOT 500 — content is either published + logged (fail-open) or
 *   held for review (fail-closed) per the surface's intent.
 * - [ ] If the app has reporting, the round-trip works: a user's `report()`
 *   creates a 'pending' `Report`, it appears in the moderator queue via
 *   `getReports()`, and `resolveReport()` (approve/reject/dismiss) visibly
 *   changes its status and clears it from the pending queue.
 * - [ ] Moderator surfaces are privileged: a non-admin can't reach
 *   `getReports()` / `resolveReport()` (403) and can't see other users' flagged
 *   or pending content.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
