/**
 * OpenAI ai-embeddings provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-embeddings'
 * import { createProvider } from '@molecule/api-ai-embeddings-openai'
 *
 * // Startup (server only): the key comes from the server env.
 * setProvider(
 *   createProvider({
 *     apiKey: process.env.OPENAI_API_KEY,
 *     defaultModel: 'text-embedding-3-small',
 *     dimensions: 512, // optional: shorten vectors (text-embedding-3 models only)
 *   }),
 * )
 *
 * // One request for the whole batch; vectors are under `embeddings`.
 * const { embeddings, usage } = await requireProvider().embed({
 *   input: ['How do I reset my password?', 'Billing and invoices'],
 * })
 * const query = await requireProvider().embedQuery('forgot my password') // number[]
 * console.log(embeddings.length, embeddings[0]?.length, query.length, usage.totalTokens) // 2 512 512 11
 * ```
 *
 * @remarks
 * Config: `OPENAI_API_KEY` (SERVER-side only) plus optional `defaultModel`
 * (default `text-embedding-3-small`; also supports `text-embedding-3-large`
 * and `text-embedding-ada-002`), `dimensions` (text-embedding-3 models only),
 * `maxBatchSize` (default 2048 inputs per request — larger arrays are batched
 * automatically), and a base URL override (`OPENAI_BASE_URL` env var or
 * `baseUrl`, for proxies/gateways).
 *
 * Wire it with the core's `setProvider(...)` from `@molecule/api-ai-embeddings`
 * (equivalent to `bond('ai-embeddings', …)`) — importing this package does not
 * wire anything by itself.
 *
 * Unlike the chat AI bonds, a missing `OPENAI_API_KEY` does NOT fail fast —
 * the first embed call fails with the upstream 401. Validate the key at boot
 * if you want an actionable startup error.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIEmbeddingsProvider } from '@molecule/api-ai-embeddings'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars are resolved. */
let _provider: AIEmbeddingsProvider | null = null

/**
 * The provider implementation.
 */
export const provider: AIEmbeddingsProvider = new Proxy({} as AIEmbeddingsProvider, {
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
