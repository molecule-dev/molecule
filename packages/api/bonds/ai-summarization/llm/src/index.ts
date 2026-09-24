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
 * import { setProvider as setAIProvider } from '@molecule/api-ai'
 * import { createProvider } from '@molecule/api-ai-anthropic'
 * import { requireProvider, setProvider } from '@molecule/api-ai-summarization'
 * import { provider as summarizer } from '@molecule/api-ai-summarization-llm'
 *
 * // Startup (server only): bond the LLM this composes FIRST, then the summarizer.
 * setAIProvider('anthropic', createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
 * setProvider(summarizer)
 *
 * const article =
 *   'Acme Corp reported Q3 revenue of $12M, up 20% year over year, driven by its new ' +
 *   'subscription tier. Operating costs rose 5%, and the company raised full-year guidance.'
 *
 * const { summary, usage } = await requireProvider().summarize({
 *   text: article,
 *   format: 'bullets', // 'paragraph' (default) | 'bullets' | 'tldr'
 *   maxLength: 60, // roughly this many WORDS (a prompt hint, not a hard cut)
 *   focus: 'the financial impact',
 * })
 * console.log(summary) // '- Revenue up 20% to $12M\n- Guidance raised'
 * console.log(usage) // { inputTokens: 80, outputTokens: 12 }
 * ```
 *
 * @remarks
 * Composes the swappable `ai` bond: an `ai` provider MUST be bonded first
 * (`setProvider(...)` from `@molecule/api-ai`, e.g. `setProvider('anthropic', createProvider())`)
 * or `summarize()` throws (a missing AI provider throws at `summarize()` time, not at
 * import). Pass `provider` on the input to target a specific named `ai` provider — required
 * once more than one named `ai` provider is bonded, since the default then becomes ambiguous.
 * Because it is just prompt orchestration over the bonded LLM, swapping the `ai` provider
 * swaps the model behind every summary without touching call sites.
 *
 * - `maxLength` is a WORD budget written into the system prompt — the model is asked to stay
 *   under it; the output is NOT truncated. There is no `length`/`maxTokens` option.
 * - The call is non-streaming (`stream: false`); an `error` event from the LLM is re-thrown as
 *   `AI summarization failed: …`, so wrap user-facing calls in try/catch.
 * - The summary is whitespace-trimmed model text — bullets are whatever the model returns
 *   (typically `- ` lines); it is not parsed into an array.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
