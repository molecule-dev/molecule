/**
 * Local (OpenAI-compatible) ai-local provider for molecule.dev.
 *
 * Streams chat completions from any local inference server that speaks the
 * OpenAI `chat/completions` protocol (Ollama, LM Studio, llama.cpp, vLLM),
 * keyless by default.
 *
 * @remarks
 * **Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
 * malformed tool schema) gets its own non-retryable message distinct from the generic
 * "AI service error. Please try again." used for retryable failures.
 *
 * - **Bond it by NAME: `setProvider('local', createProvider(...))`** from `@molecule/api-ai`.
 *   The first named provider also becomes the default for `requireProvider()`; once you bond a
 *   SECOND named provider, `requireProvider()` throws as ambiguous — select with
 *   `getProviderByName('local')` instead. Importing this package wires nothing by itself.
 * - **`baseUrl` MUST include the version segment** (`http://localhost:11434/v1`, not
 *   `http://localhost:11434`) — the request goes to `${baseUrl}/chat/completions`. Resolution:
 *   `baseUrl` → `LOCAL_AI_BASE_URL` → `OLLAMA_BASE_URL` → `http://localhost:11434/v1`.
 * - The config key for the default model is `model` (NOT `defaultModel`); it falls back to
 *   `LOCAL_AI_MODEL`, then `llama3.1`. The model must already be pulled on the server
 *   (e.g. `ollama pull llama3.1`) — this bond does not download models.
 * - No API key is required: the `Authorization` header is sent only when `apiKey` /
 *   `LOCAL_AI_API_KEY` is set, and a missing key never throws.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai'
 * import { createProvider } from '@molecule/api-ai-local'
 *
 * // Startup (server only): bond by name. Points at a local Ollama server by default.
 * setProvider(
 *   'local',
 *   createProvider({
 *     baseUrl: process.env.LOCAL_AI_BASE_URL ?? 'http://localhost:11434/v1',
 *     model: process.env.LOCAL_AI_MODEL ?? 'llama3.1',
 *   }),
 * )
 *
 * // In a request handler: stream the reply (forward each chunk to the client, e.g. over SSE).
 * let reply = ''
 * for await (const event of requireProvider().chat({
 *   messages: [{ role: 'user', content: 'What is 2 + 2?' }],
 *   maxTokens: 256,
 * })) {
 *   if (event.type === 'text') reply += event.content
 *   if (event.type === 'error') throw new Error(event.message) // failures are events, not throws
 *   if (event.type === 'done') console.log(event.usage) // { inputTokens: 14, outputTokens: 8 }
 * }
 * console.log(reply) // '2 + 2 = 4.'
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export { createProvider, LocalAIProvider } from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIProvider } from '@molecule/api-ai'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so env vars / config are resolved. */
let _provider: AIProvider | null = null
/** The provider implementation. Constructs keyless — no secret required. */
export const provider: AIProvider = new Proxy({} as AIProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
