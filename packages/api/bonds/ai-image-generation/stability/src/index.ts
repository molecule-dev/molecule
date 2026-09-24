/**
 * Stability AI image generation provider for molecule.dev.
 *
 * Implements `@molecule/api-ai-image-generation` over the Stability AI
 * Stable Image v2beta REST API (SD3/SD3.5, Core and Ultra models), plus
 * image-to-image and upscaling.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-image-generation'
 * import { createProvider } from '@molecule/api-ai-image-generation-stability'
 *
 * // Startup (server only): the key comes from the server env.
 * setProvider(
 *   createProvider({ apiKey: process.env.STABILITY_API_KEY, defaultModel: 'sd3.5-large' }),
 * )
 *
 * const { images, model } = await requireProvider().generate({
 *   prompt: 'A lighthouse at dusk, oil painting',
 * })
 * const image = images[0]
 * if (!image?.base64) throw new Error('Stability returned no image')
 * // Stability returns bytes, never a hosted URL: store `image.data` (a Buffer) or inline it.
 * const src = `data:${image.mimeType};base64,${image.base64}`
 * console.log(model, image.seed, src.slice(0, 22)) // 'sd3.5-large' 42 'data:image/png;base64,'
 * ```
 *
 * @remarks
 * - **Wire it with `setProvider(createProvider(...))` from
 *   `@molecule/api-ai-image-generation`.** `createProvider()` THROWS right away
 *   when neither `apiKey` nor `STABILITY_API_KEY` is set; the exported lazy
 *   `provider` throws the same error on first use instead.
 * - **Images come back as bytes, not URLs**: each `GeneratedImage` has `data`
 *   (Buffer), `base64`, `mimeType` and `seed` — `url` is never set. Persist the
 *   bytes (e.g. via `@molecule/api-uploads`) if you need a link.
 * - Through the core `generate()`, only `prompt` and `model` take effect —
 *   `size`, `n`, `quality`, `style` and `responseFormat` are IGNORED (one image,
 *   the model's default aspect ratio). The Stability-specific fields
 *   (`negativePrompt`, `aspectRatio`, `width`/`height`, `count`, `seed`,
 *   `outputFormat`, `stylePreset`) are read only when you call a provider
 *   created by `createProvider()` directly.
 * - `model` picks the endpoint: `'ultra'`, `'core'`, or an SD3 id
 *   (`'sd3.5-large'` default, `'sd3.5-large-turbo'`, `'sd3.5-medium'`, ...).
 *   `stylePreset` is ignored on SD3 models.
 * - 429/5xx responses are retried with backoff (`maxRetries`, default 3,
 *   honoring `Retry-After` in SECONDS); other errors throw
 *   `Stability AI API error (<status>): <message>`.
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
