/**
 * Stability AI image generation provider for molecule.dev.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import type { AIImageGenerationProvider } from '@molecule/api-ai-image-generation'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars are resolved. */
let _provider: AIImageGenerationProvider | null = null

/**
 * The provider implementation.
 */
export const provider: AIImageGenerationProvider = new Proxy({} as AIImageGenerationProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
