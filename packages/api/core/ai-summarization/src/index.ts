/**
 * AI summarization for molecule.dev — concise summaries over any bonded LLM.
 *
 * A *core* package that both defines the `AISummarizationProvider` contract AND
 * ships a batteries-included default `provider`. The default has no vendor of
 * its own — it composes the swappable `ai` chat bond (`@molecule/api-ai`) with a
 * summarizer system prompt built from the requested format / length / focus.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider as anthropic } from '@molecule/api-ai-anthropic'
 * import { provider as summarization, requireProvider } from '@molecule/api-ai-summarization'
 *
 * // Wire the AI chat provider the default composes, then the summarizer itself.
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
 * @remarks
 * The default `provider` REQUIRES an `ai` provider to be bonded: it composes
 * `@molecule/api-ai`, so `bond('ai', <someAiProvider>)` must run first (a missing
 * AI provider throws at `summarize()` time, not at import). Pass `provider` on
 * the input to target a specific named AI provider. Apps wanting different
 * behavior can swap in their own `AISummarizationProvider` via
 * `bond('ai-summarization', myProvider)` without changing any call site.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
