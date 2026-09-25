/**
 * OpenAI content classifier for `@molecule/api-content-moderation`.
 *
 * Scores text and images with OpenAI's moderation endpoint
 * (`omni-moderation-latest`), which OpenAI does not charge for.
 *
 * @example
 * ```typescript
 * import { setClassifier, requireClassifier } from '@molecule/api-content-moderation'
 * import { classifier } from '@molecule/api-content-moderation-openai'
 *
 * setClassifier(classifier) // reads OPENAI_API_KEY on first use
 *
 * const verdict = await requireClassifier().check(post.body)
 * if (verdict.flagged) {
 *   // Reject, or hold for review, BEFORE saving.
 * }
 * const image = await requireClassifier().checkImage!(bytes, { mimeType: 'image/png' })
 * ```
 *
 * @remarks
 * - Wire with `setClassifier` — NOT `setProvider`: this is a classifier (scores
 *   only), not the full `ContentModerationProvider` with user reports.
 * - Config: `OPENAI_API_KEY` (SERVER-side only); optional `OPENAI_BASE_URL`.
 * - Categories are OpenAI's names: `harassment`, `harassment/threatening`,
 *   `hate`, `hate/threatening`, `illicit`, `illicit/violent`, `self-harm`,
 *   `self-harm/intent`, `self-harm/instructions`, `sexual`, `sexual/minors`,
 *   `violence`, `violence/graphic`. Results are sorted highest score first.
 * - Without `threshold` the verdict is OpenAI's own. With `threshold`, a
 *   category is flagged iff its score ≥ threshold — lower it to be stricter.
 *   Pass `categories` to decide on a subset (e.g. only `sexual/minors`).
 * - Errors are `OpenaiModerationError` with `status`; nothing is retried. Decide
 *   per surface whether a failed check blocks the content or holds it for
 *   review — never publish silently on an exception.
 * - No OpenAI account? `@molecule/api-content-moderation-molecule` exposes the
 *   same classifier through molecule.dev, billed to the molecule project.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './classifier.js'
export * from './secrets.js'
export * from './types.js'

import type { ContentClassifierProvider } from '@molecule/api-content-moderation'

import { createClassifier } from './classifier.js'

/** Lazily-initialized classifier. Defers creation until first use so env vars are resolved. */
let _classifier: ContentClassifierProvider | null = null

/**
 * The classifier implementation (wire with `setClassifier`).
 */
export const classifier: ContentClassifierProvider = new Proxy({} as ContentClassifierProvider, {
  get(_, prop, receiver) {
    if (!_classifier) _classifier = createClassifier()
    return Reflect.get(_classifier, prop, receiver)
  },
  set(_, prop, value) {
    if (!_classifier) _classifier = createClassifier()
    return Reflect.set(_classifier, prop, value)
  },
})
