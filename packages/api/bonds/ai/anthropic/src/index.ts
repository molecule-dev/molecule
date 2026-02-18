/**
 * Anthropic ai-anthropic provider for molecule.dev.
 *
 * @module
 */

export * from './provider.js'
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
})
