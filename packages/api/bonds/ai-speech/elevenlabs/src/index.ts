/**
 * ElevenLabs ai-speech provider for molecule.dev.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import type { AISpeechProvider } from '@molecule/api-ai-speech'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars are resolved. */
let _provider: AISpeechProvider | null = null

/**
 * The provider implementation.
 */
export const provider: AISpeechProvider = new Proxy({} as AISpeechProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
