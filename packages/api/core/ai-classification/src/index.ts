/**
 * Zero-shot AI text classification for molecule.dev.
 *
 * Score a piece of text against a set of candidate labels using an LLM — no
 * training, no fixed taxonomy. The default `provider` exported here is a
 * batteries-included implementation that composes the swappable `ai` chat bond
 * (`@molecule/api-ai`): it prompts the bonded model to return strict JSON
 * scores, then normalizes them into a sorted `ClassifyResult`.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider as anthropic } from '@molecule/api-ai-anthropic'
 * import { provider as classification, requireProvider } from '@molecule/api-ai-classification'
 *
 * // Wire an AI provider + the classifier at startup.
 * bond('ai', anthropic)
 * bond('ai-classification', classification)
 *
 * // Use it anywhere.
 * const result = await requireProvider().classify({
 *   text: 'Win a FREE $1000 gift card now!!!',
 *   labels: ['spam', 'ham'],
 * })
 * console.log(result.top)    // 'spam'
 * console.log(result.labels) // [{ label: 'spam', score: 0.98 }, { label: 'ham', score: 0.02 }]
 * ```
 *
 * @remarks
 * - **Requires a bonded `ai` provider.** `classify()` resolves the AI provider
 *   from the bond registry at call time via `@molecule/api-ai` — bond one
 *   (`bond('ai', anthropic)`) before classifying or it throws.
 * - **Swappable.** Both the classifier (`bond('ai-classification', ...)`) and
 *   the underlying model (`bond('ai', ...)`) are swappable at runtime; the
 *   default provider follows whichever `ai` provider is bonded.
 * - Pass `multiLabel: true` when several labels can apply at once, and
 *   `instructions` to give the model label definitions or extra guidance.
 * - `result.labels` is restricted to the candidate set, sorted descending by
 *   score; missing labels default to `0`. Unparseable model output throws (with
 *   an output snippet) rather than returning silent garbage.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
