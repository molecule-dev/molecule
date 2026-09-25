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
 * import { setProvider, requireProvider } from '@molecule/api-content-moderation'
 * import type { ContentModerationProvider } from '@molecule/api-content-moderation'
 *
 * // Bond a provider at startup
 * setProvider(myModerationProvider)
 *
 * // Use anywhere in the app
 * const moderation = requireProvider()
 * const result = await moderation.check('some user content')
 * if (result.flagged) {
 *   console.log('Content flagged:', result.categories)
 * }
 * ```
 *
 *
 * **Scoring only? Use a classifier.** Classifier bonds score content and store
 * nothing; bond one with `setClassifier` and call `requireClassifier()`:
 *
 * ```typescript
 * import { setClassifier, requireClassifier } from '@molecule/api-content-moderation'
 * import { classifier } from '@molecule/api-content-moderation-openai' // or -molecule
 *
 * setClassifier(classifier)
 *
 * const verdict = await requireClassifier().check(comment.body)
 * if (verdict.flagged) throw new Error('This comment breaks the community rules.')
 * ```
 *
 * @remarks
 * - **Two bond slots.** `setClassifier` / `requireClassifier` hold a
 *   `ContentClassifierProvider` (scores only — OpenAI, molecule.dev hosted). The
 *   full `ContentModerationProvider` (`setProvider`) adds user reports and a
 *   moderator queue; no package ships one, so implement it in the app: delegate
 *   `check()` / `checkImage()` to `requireClassifier()` and store reports with
 *   the DataStore. Never `setProvider(classifier)` — it lacks the report methods.
 * - Classifier category names are the provider's own (`harassment/threatening`,
 *   `sexual/minors`, …), not the `ModerationCategory` union — filter with
 *   `options.categories` using the names the provider returns.
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
