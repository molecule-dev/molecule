/**
 * Zero-shot AI text classification for molecule.dev.
 *
 * Score a piece of text against a set of candidate labels using an LLM — no
 * training, no fixed taxonomy. This core package defines the
 * `AIClassificationProvider` contract and its bond accessor only; bond a
 * concrete provider (e.g. `@molecule/api-ai-classification-llm`, which composes
 * the swappable `ai` chat bond) to give an app classification.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider as anthropic } from '@molecule/api-ai-anthropic'
 * import { provider as classification } from '@molecule/api-ai-classification-llm'
 * import { requireProvider } from '@molecule/api-ai-classification'
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
 * - **Interface + accessor only.** This core ships zero implementation. The
 *   batteries-included classifier lives in `@molecule/api-ai-classification-llm`.
 * - **Swappable.** Both the classifier (`bond('ai-classification', ...)`) and
 *   the underlying model (`bond('ai', ...)`) are swappable at runtime.
 * - `ClassifyResult.labels` is restricted to the candidate set, sorted
 *   descending by score. See the bonded provider for parsing/normalization
 *   semantics.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
