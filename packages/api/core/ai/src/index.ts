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
 * for await (const event of ai.chat(params)) {
 *   if (event.type === 'text') process.stdout.write(event.content)
 * }
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
