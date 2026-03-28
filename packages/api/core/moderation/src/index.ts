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
 */

export * from './provider.js'
export * from './types.js'
