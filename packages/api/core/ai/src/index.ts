/**
 * Model-agnostic AI chat interface for molecule.dev.
 *
 * Defines the `AIProvider` interface that bond packages (Anthropic, OpenAI, etc.)
 * implement, plus types for messages, streaming events, tool use, and token usage.
 *
 * @remarks
 * The AI provider is a SERVER-side integration — a weak integration leaks the key, trusts
 * the model, or gets billed:
 *
 * - **The provider API key is SERVER-ONLY.** Call `chat()` from YOUR API and stream results
 *   to the browser (SSE); NEVER put the AI key in the frontend or call the provider directly
 *   from the browser — the key would ship to every user.
 * - **Never blindly trust model output.** Treat anything the model returns — code, SQL, a
 *   shell command, a URL, a tool-call argument — as UNTRUSTED input: validate/whitelist it,
 *   run it only in a sandbox, and re-check permissions server-side. User/content text in the
 *   prompt can hijack the model (prompt injection), so model output must never directly
 *   trigger a privileged action (delete, pay, email, exec) without your own authorization +
 *   validation.
 * - **Gate + budget it.** Require auth and rate-limit AI endpoints and cap `maxTokens` — an
 *   open, unauthenticated AI route is an unbounded bill.
 * - `chat()` returns an async iterable of `ChatEvent` (text chunks, tool calls, a final
 *   `done` with usage) — iterate it and forward chunks to the client.
 * - **`setProvider(name, provider)` ambiguity:** the FIRST named provider you register also
 *   auto-promotes to the singleton (so plain `getProvider()`/`requireProvider()` work without
 *   the caller knowing the name) — but that promotion is a single-provider convenience, not a
 *   permanent pick. The moment a SECOND, differently-named provider is registered,
 *   `getProvider()` stops returning the first one and declines (`null`) instead —
 *   `requireProvider()` throws pointing at `getProviderByName(name)`. Call the explicit
 *   `setProvider(provider)` (no name) form if you want one provider to always win regardless of
 *   how many named providers you also register.
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/api-ai'
 * import type { ChatParams } from '@molecule/api-ai'
 *
 * const ai = requireProvider()
 * const params: ChatParams = {
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   stream: true,
 * }
 * let reply = ''
 * for await (const event of ai.chat(params)) {
 *   if (event.type === 'text') reply += event.content // or forward the chunk to the client (SSE)
 * }
 * console.log(reply)
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual chat/AI screens, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip. The
 * sandbox HAS an AI provider bonded, so the flow runs live end-to-end; AI
 * output is NON-DETERMINISTIC, so assert on STRUCTURE/behavior, not exact text:
 * - [ ] A message sent through the real chat UI comes back as a RELEVANT AI
 *   reply — not an echo of the prompt, a hardcoded stub, or an empty bubble.
 *   Ask something with a checkable answer (e.g. "What is 2 + 2?") and confirm
 *   the response actually contains it ("4"), proving a live model answered.
 * - [ ] If the app streams, tokens render INCREMENTALLY — text grows word by
 *   word in the UI, not one final blob dumped after a long frozen spinner. (A
 *   streamed `chat()` yields `text` chunks then a final `done`; a single late
 *   blob means the reply was awaited whole and streaming is broken.)
 * - [ ] Multi-turn CONTEXT is preserved: a follow-up that refers back to the
 *   previous turn (e.g. after "2 + 2", ask "now double that" -> understood as
 *   8) works — proving the full `messages` history is sent, not just the last
 *   line.
 * - [ ] A provider failure (bad/missing key, rate limit, timeout) surfaces as
 *   a graceful in-UI error message, NOT a crash, blank screen, a spinner that
 *   never resolves, or an unhandled 500. Force one and watch the UI recover.
 * - [ ] The provider key + the provider call are SERVER-side only: the key
 *   never reaches the browser (check the network tab, the JS bundle, and page
 *   globals), and no route proxies arbitrary prompts to the model without auth
 *   + a token cap — an open AI endpoint is an unbounded bill and abuse vector.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
