/**
 * Anthropic ai-anthropic provider for molecule.dev.
 *
 * @remarks
 * Bond this as an AI provider (see `@molecule/api-ai` for the `chat()` streaming loop and the
 * key-server-side / never-blindly-trust-model-output rules). Config: `ANTHROPIC_API_KEY`
 * (SERVER-side only — never shipped to the browser) plus an optional default model id. Drive it
 * through the core `chat()` / `requireProvider()`, NOT the Anthropic SDK directly, so the app
 * stays provider-agnostic and can swap models/providers by changing only the bond.
 *
 * **Missing `ANTHROPIC_API_KEY` fails fast**: the provider throws naming the exact env var on
 * first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
 * not at bond/module-load time) — it never silently sends an empty key and surfaces only as a
 * generic 401 later.
 *
 * **Error message disambiguation**: a non-OK response yields a sanitized `error` ChatEvent
 * (never a throw). A permanently-invalid request — a plain 400 that ISN'T a context-length
 * error (bad param, malformed tool schema) — gets its own non-retryable message ("AI request
 * was invalid — check the model and request parameters.") distinct from the generic "AI service
 * error. Please try again." used for retryable failures; don't retry a plain 400 as if it might
 * succeed on a second attempt.
 *
 * - **Bond it by NAME: `setProvider('anthropic', createProvider(...))`** from `@molecule/api-ai`.
 *   The first named provider also becomes the default for `requireProvider()`; once you bond a
 *   SECOND named provider (e.g. `'openai'`), `requireProvider()` throws as ambiguous — select with
 *   `getProviderByName('anthropic')` instead. Importing this package wires nothing by itself.
 * - `maxTokens` is per-call on `chat()` (or `maxTokens` in `createProvider`); the default model is
 *   `claude-opus-5-5` unless you pass `defaultModel` or `params.model`.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai'
 * import { createProvider } from '@molecule/api-ai-anthropic'
 *
 * // Startup (server only): bond by name. The key comes from the server env.
 * setProvider('anthropic', createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
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
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIProvider } from '@molecule/api-ai'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars / secrets are resolved. */
let _provider: AIProvider | null = null
/**
 * The provider implementation.
 */
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
