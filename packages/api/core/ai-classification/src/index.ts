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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Each flow that classifies content (tagging, routing, moderation,
 *   triage — whatever the app defines) runs it from the real UI and the
 *   returned `top` is one of the app's candidate `labels`, never free text,
 *   with a `score` in 0..1. The sandbox has a live AI provider, so assert on
 *   the actual result — never mock the classifier or hardcode a label.
 * - [ ] Assert BOTH directions with clear samples: a clearly-on-topic example
 *   lands in its expected class AND a clearly-different example lands in a
 *   different class. A classifier that returns the same label for every input
 *   is broken — one positive check alone does not prove it works.
 * - [ ] Ambiguity is treated as uncertain, not force-fit: when the app gates
 *   on a minimum confidence, a genuinely-ambiguous input yields a low winning
 *   `score` and is routed to the app's "unsure"/unlabeled path rather than
 *   silently assigned the top label.
 * - [ ] The label actually DRIVES app behavior (routes/filters/tags/badges the
 *   item), not just renders as text — verify the downstream effect in the UI,
 *   not only that a label appeared on screen.
 * - [ ] Empty or ambiguous input is handled without a crash or a blank screen
 *   (a visible "couldn't classify"/unlabeled state, not an unhandled error).
 * - [ ] The classify call runs SERVER-SIDE: it goes through the app's API and
 *   the AI provider key never reaches the browser — the Network tab shows no
 *   provider request or key issued from client code.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
