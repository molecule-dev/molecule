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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
