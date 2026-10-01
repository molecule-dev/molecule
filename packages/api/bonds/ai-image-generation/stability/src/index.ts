/**
 * Stability AI image generation provider for molecule.dev.
 *
 * @example
 * ```typescript
 * // npm install @molecule/api-ai-image-generation-stability --workspace=api
 * import { setProvider, requireProvider } from '@molecule/api-ai-image-generation'
 * import { provider } from '@molecule/api-ai-image-generation-stability'
 *
 * setProvider(provider) // reads STABILITY_API_KEY from the environment
 *
 * const { images } = await requireProvider().generate({
 *   prompt: 'A watercolor fox reading a book',
 *   aspectRatio: '16:9', // or width/height — see @molecule/api-ai-image-generation
 * })
 * // images[0] may carry url, base64, or data — persist what the app needs to keep.
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
