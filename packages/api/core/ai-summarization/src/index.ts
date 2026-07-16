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
