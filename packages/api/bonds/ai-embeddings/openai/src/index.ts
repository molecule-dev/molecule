/**
 * OpenAI ai-embeddings provider for molecule.dev.
 *
 * @remarks
 * Config: `OPENAI_API_KEY` (SERVER-side only) plus optional `defaultModel`
 * (default `text-embedding-3-small`; also supports `text-embedding-3-large`
 * and `text-embedding-ada-002`), `dimensions` (text-embedding-3 models only),
 * `maxBatchSize` (default 2048 inputs per request — larger arrays are batched
 * automatically), and a base URL override (`OPENAI_BASE_URL` env var or
 * `baseUrl`, for proxies/gateways).
 *
 * Wire it with the core's `setProvider()` — NOT `bond('ai-embeddings', …)`:
 * the `@molecule/api-ai-embeddings` core keeps its own singleton and never
 * reads the bond registry (see the core's docs).
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
