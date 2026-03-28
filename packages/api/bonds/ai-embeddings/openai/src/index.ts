/**
 * OpenAI ai-embeddings provider for molecule.dev.
 *
 * @module
 */

export * from './provider.js'
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
})
