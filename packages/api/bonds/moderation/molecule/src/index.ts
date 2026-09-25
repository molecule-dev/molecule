/**
 * molecule.dev hosted content classifier for `@molecule/api-content-moderation`.
 *
 * Scores text and images on molecule.dev and bills the check to your molecule
 * project, so the app needs no OpenAI account. It is an ordinary bond: swap it
 * for `@molecule/api-content-moderation-openai` (your own key) without changing
 * code that calls the core.
 *
 * @example
 * ```typescript
 * import { setClassifier, requireClassifier } from '@molecule/api-content-moderation'
 * import { classifier } from '@molecule/api-content-moderation-molecule'
 *
 * setClassifier(classifier) // reads MOLECULE_API_KEY from the environment
 *
 * const verdict = await requireClassifier().check(comment.body)
 * if (verdict.flagged) {
 *   // Reject, or hold for review, BEFORE saving.
 * }
 * ```
 *
 * @remarks
 * - Wire with `setClassifier` — NOT `setProvider`: this scores content only; it
 *   has no user reports or moderator queue.
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) with scope `broker` or `broker:moderation`. Optional
 *   `MOLECULE_SERVICES_URL` (default `https://api.molecule.dev/api/v1/services`).
 * - Served by OpenAI's `omni-moderation-latest`, so category names are OpenAI's
 *   (`harassment`, `hate/threatening`, `sexual/minors`, `violence/graphic`, …),
 *   sorted highest score first. `threshold` re-decides each category by score;
 *   `categories` limits the verdict to a subset.
 * - At most 100,000 characters of text or a 4 MB image (png, jpeg, webp, gif)
 *   per check.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 too large, 429 / 503 retry later). Nothing is
 *   retried. Decide per surface whether a failed check blocks the content or
 *   holds it for review — never publish silently on an exception.
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
