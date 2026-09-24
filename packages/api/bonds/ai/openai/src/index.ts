/**
 * OpenAI (GPT) AI provider for molecule.dev.
 *
 * @remarks
 * Config: `OPENAI_API_KEY` (SERVER-side only) plus an optional default model id/base URL.
 *
 * **Endpoint**: on OpenAI's own API (`https://api.openai.com`, the default) the provider calls
 * the Responses API (`/v1/responses`); on any other `baseUrl` it calls `/v1/chat/completions`,
 * the endpoint OpenAI-compatible servers (Ollama, LM Studio, gateways) implement. Override
 * with `api: 'responses' | 'chat-completions'`. Current OpenAI reasoning models only accept
 * function tools together with reasoning on `/v1/responses` (gpt-6-astra rejects every
 * tool-carrying request on chat/completions), and only Responses carries OpenAI's server-side
 * tools (`serverTools`, e.g. `{ type: 'web_search', name: 'web_search' }`); chat/completions
 * ignores `serverTools`. `extraBody` is merged into whichever endpoint's body is sent, so its
 * keys must be that endpoint's params (e.g. `reasoning`, not `reasoning_effort`, on Responses).
 *
 * **Missing `OPENAI_API_KEY` fails fast**: the provider throws naming the exact env var on
 * first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
 * not at bond/module-load time) — it never silently sends an empty key.
 *
 * **Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
 * malformed tool schema) gets its own non-retryable message distinct from the generic
 * "AI service error. Please try again." used for retryable failures.
 *
 * - **Bond it by NAME: `setProvider('openai', createProvider(...))`** from `@molecule/api-ai`.
 *   The first named provider also becomes the default for `requireProvider()`; once you bond a
 *   SECOND named provider, `requireProvider()` throws as ambiguous — select with
 *   `getProviderByName('openai')` instead. Importing this package wires nothing by itself.
 * - Default model is `gpt-6-luna` (override with `defaultModel` or per-call `params.model`).
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai'
 * import { createProvider } from '@molecule/api-ai-openai'
 *
 * // Startup (server only): bond by name. The key comes from the server env.
 * setProvider('openai', createProvider({ apiKey: process.env.OPENAI_API_KEY }))
 *
 * // In a request handler: stream the reply (forward each chunk to the client, e.g. over SSE).
 * let reply = ''
 * for await (const event of requireProvider().chat({
 *   messages: [{ role: 'user', content: 'What is 2 + 2?' }],
 *   maxTokens: 256,
 * })) {
 *   if (event.type === 'text') reply += event.content
 *   if (event.type === 'error') throw new Error(event.message) // failures are events, not throws
 *   if (event.type === 'done') console.log(event.usage) // { inputTokens: 14, outputTokens: 8, cacheReadInputTokens: 0 }
 * }
 * console.log(reply) // '2 + 2 = 4.'
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export { createProvider, OpenaiAIProvider } from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIProvider } from '@molecule/api-ai'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so env vars / secrets are resolved. */
let _provider: AIProvider | null = null
/** The provider implementation. */
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
