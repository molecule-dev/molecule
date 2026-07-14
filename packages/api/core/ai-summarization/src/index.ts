/**
 * AI summarization for molecule.dev — concise summaries over any bonded LLM.
 *
 * A *core* package: it defines the `AISummarizationProvider` contract and the
 * bond accessor only — zero concrete implementation. The batteries-included
 * default lives in the bond package `@molecule/api-ai-summarization-llm`, which
 * composes the swappable `ai` chat bond (`@molecule/api-ai`). Apps may bond that
 * default or any custom `AISummarizationProvider`.
 *
 * @example
 * ```typescript
 * import { provider as anthropic } from '@molecule/api-ai-anthropic'
 * import { requireProvider } from '@molecule/api-ai-summarization'
 * import { provider } from '@molecule/api-ai-summarization-llm'
 * import { bond } from '@molecule/api-bond'
 *
 * // Wire the AI chat provider the default composes, then bond the summarizer.
 * bond('ai', anthropic)
 * bond('ai-summarization', provider)
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
 * This core imports `@molecule/api-ai` only as a *type* (the shared `TokenUsage`
 * interface on `SummarizeResult`) — never for runtime use. A provider must be
 * bonded before `requireProvider()` resolves (it throws otherwise). Swap in a
 * custom `AISummarizationProvider` via `bond('ai-summarization', myProvider)`
 * without changing any call site.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
