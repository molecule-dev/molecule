/**
 * Default (`llm`) AI summarization provider for molecule.dev.
 *
 * Turns a block of text into a concise summary over whatever LLM the app has
 * bonded. It has no vendor of its own — it composes the swappable `ai` chat
 * bond (`@molecule/api-ai`) with a summarizer system prompt built from the
 * requested format / length / focus, so swapping the LLM swaps the summarizer.
 *
 * @example
 * ```typescript
 * import { provider as anthropic } from '@molecule/api-ai-anthropic'
 * import { requireProvider } from '@molecule/api-ai-summarization'
 * import { provider as summarization } from '@molecule/api-ai-summarization-llm'
 * import { bond } from '@molecule/api-bond'
 *
 * // Wire the AI chat provider this composes, then bond the summarizer.
 * bond('ai', anthropic)
 * bond('ai-summarization', summarization)
 *
 * // Use anywhere after startup.
 * const { summary, usage } = await requireProvider().summarize({
 *   text: longArticle,
 *   format: 'bullets',
 *   maxLength: 60,
 *   focus: 'the financial impact',
 * })
 * ```
 *
 * @example
 * ```typescript
 * // A one-sentence TL;DR with a HARD word cap, cached across builds — e.g. a
 * // build step that summarizes each long section of each page.
 * import { provider as anthropic } from '@molecule/api-ai-anthropic'
 * import { setProvider as setAI } from '@molecule/api-ai'
 * import { setProvider as setSummarizer } from '@molecule/api-ai-summarization'
 * import {
 *   countWords,
 *   createFileSummaryCache,
 *   provider as summarization,
 *   summarizeCached,
 * } from '@molecule/api-ai-summarization-llm'
 *
 * setAI(anthropic)
 * setSummarizer(summarization)
 *
 * const cache = createFileSummaryCache('.cache/summaries.json')
 * const rows: Record<string, string> = {}
 * for (const section of sections) {
 *   if (countWords(section.prose) < 80) continue // too short to be worth a summary
 *   const r = await summarizeCached(
 *     { text: section.prose, format: 'tldr', maxWords: 25 },
 *     { cache },
 *   )
 *   rows[r.key] = r.summary // one complete sentence, ≤ 25 words
 * }
 * cache.save()
 * // publish `rows` (e.g. write it next to the page as summaries.json)
 * ```
 *
 * @remarks
 * **A hard cap is enforced here, in code — do not rebuild it.** With `maxWords`
 * (and/or `sentences`, which defaults to 1 for `format: 'tldr'`) the provider
 * cleans the answer (drops "TL;DR:" labels, quotes, `<think>` blocks), keeps
 * whole sentences only, checks the cap and that the last word is not a
 * function word ("the", "and", "of"…), and asks the model again when it runs
 * long (`attempts`, default 3). It never slices a sentence and adds a full
 * stop. If every attempt runs long it returns the shortest complete sentence
 * with `withinCap: false`; `summarizeCached` does not store those, so the next
 * run retries. It throws only when the model returns no usable text at all, or
 * the AI provider fails — so "unavailable" is for a missing key or an
 * unreachable provider, never for a long answer.
 *
 * Model quirks it already handles: it sends no `temperature` (several current
 * models reject it), and it asks for a large output budget, because a model
 * that reasons before answering can spend a small `maxTokens` entirely on
 * hidden reasoning and stream no text.
 *
 * `summarizeCached` keys by a SHA-256 of the whitespace-normalized text plus
 * every option, so an unchanged text is never re-summarized; `summaryKey(input)`
 * gives the same key without calling the model. The cache is a plain JSON file
 * (`{ version: 1, entries: { key: { summary } } }`); call `save()` once at the
 * end. Server-only (Node `fs`/`crypto`): run it in a build script or a server
 * route, never in client code — at build time, bond the `ai` provider inside
 * the script that summarizes, since a bundler's separate passes do not share
 * bonds set up elsewhere.
 *
 * Composes the swappable `ai` bond: an `ai` provider MUST be bonded first
 * (`bond('ai', <provider>)`) or `summarize()` throws (a missing AI provider
 * throws at `summarize()` time, not at import). Pass `provider` on the input to
 * target a specific named `ai` provider. Because it is just prompt orchestration
 * over the bonded LLM, swapping the `ai` provider swaps the model behind every
 * summary without touching call sites.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './cache.js'
export * from './provider.js'
