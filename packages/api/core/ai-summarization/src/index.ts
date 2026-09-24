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
 * import { setProvider as setAiProvider } from '@molecule/api-ai'
 * import { createProvider as createAnthropic } from '@molecule/api-ai-anthropic'
 * import { requireProvider, setProvider } from '@molecule/api-ai-summarization'
 * import { provider as summarizer } from '@molecule/api-ai-summarization-llm'
 *
 * // Startup (server only): bond the chat model, then the summarizer that uses it.
 * setAiProvider(createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
 * setProvider(summarizer)
 *
 * const article =
 *   'Acme Corp reported Q3 revenue of $12M, up 20% year over year, driven by its new ' +
 *   'subscription tier. Operating costs rose 5%, and the company raised full-year guidance.'
 *
 * const { summary, usage } = await requireProvider().summarize({
 *   text: article,
 *   format: 'bullets',
 *   maxLength: 60, // WORDS, not characters or tokens
 *   focus: 'the financial impact',
 * })
 * console.log(summary) // '- Revenue up 20% to $12M\n- Full-year guidance raised'
 * console.log(usage?.outputTokens) // 14
 * ```
 *
 * @remarks
 * - **Two bonds, not one:** the `ai` chat bond (`@molecule/api-ai` `setProvider`) AND this
 *   package's `setProvider(summarizer)`. This core ships no implementation, and the default
 *   `@molecule/api-ai-summarization-llm` has no model of its own — without an `ai` bond,
 *   `summarize()` throws.
 * - `maxLength` is an approximate WORD count passed to the model as guidance — it is not
 *   enforced; truncate yourself if you need a hard limit.
 * - `summary` is a plain string (trimmed); `format: 'bullets'` yields markdown-style bullet
 *   lines, not an array. A model `error` event makes `summarize()` THROW.
 * - This core imports `@molecule/api-ai` only as a *type* (the shared `TokenUsage` on
 *   `SummarizeResult`). Swap in a custom `AISummarizationProvider` via `setProvider(myProvider)`
 *   without changing any call site.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Summarizing a real long document through the app's UI returns a summary
 *   that is clearly SHORTER than the input and captures its key points — not a
 *   truncation of the first N characters, not an echo of the input, not empty.
 *   The sandbox has a live AI provider, so this runs for real; the output is
 *   non-deterministic, so assert on behavior (it is shorter, the main ideas are
 *   present), never on an exact string.
 * - [ ] A second, different document yields a genuinely different summary — not
 *   the same cached/boilerplate text — confirming each summary reflects the
 *   actual input rather than a canned response.
 * - [ ] The shape/length controls actually change the output: a smaller
 *   `maxLength` (approx target words) produces a shorter summary than a larger
 *   one, and switching `format` between 'paragraph', 'bullets', and 'tldr'
 *   visibly changes the structure (bullets render as a list, tldr is terser).
 *   If the app exposes only some of these, verify the ones it exposes.
 * - [ ] Edge inputs are handled, not silently mangled: empty or whitespace-only
 *   input does not crash and gives a clear "nothing to summarize" response; very
 *   long input (beyond the model's limit) either summarizes or fails with a
 *   visible, clear message — never a silent truncation that drops half the
 *   meaning.
 * - [ ] A provider failure (the AI request errors, is rate-limited, or times
 *   out) surfaces gracefully in the UI — a readable error, no blank screen, no
 *   crash, no uncaught 500.
 * - [ ] The summarize call runs server-side only: no AI key or provider secret
 *   is ever exposed to the browser. Confirm the request goes to this app's own
 *   API and the key never appears in network traffic or the client bundle.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
