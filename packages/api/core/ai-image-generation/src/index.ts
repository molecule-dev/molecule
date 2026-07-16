/**
 * AI image-generation core interface for molecule.dev.
 *
 * Defines the `AIImageGenerationProvider` contract — generate images from text
 * prompts, plus optional edit (inpainting), image-to-image, and upscale
 * operations — and the accessor (`setProvider`/`getProvider`/`hasProvider`/
 * `requireProvider`). Interface-only: bond a provider package (e.g.
 * `@molecule/api-ai-image-generation-openai`,
 * `@molecule/api-ai-image-generation-stability`).
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-image-generation', …)`.**
 *   This core keeps its own singleton and does not read the `@molecule/api-bond`
 *   registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
 *   still throws at first use. Call `setProvider(...)` in the app's bond setup.
 * - **Feature-detect the optional methods.** Only `generate()` is required;
 *   `edit`/`imageToImage`/`upscale`/`generateImage` are optional — guard with
 *   `if (provider.edit)` and surface "not supported" instead of calling
 *   unconditionally (an absent method is a runtime TypeError that type-checks).
 * - **Two param dialects exist; only `prompt` (+ `model`) is portable.** The core
 *   ships `ImageGenerateParams` (`size: '1024x1024'`, `quality`, `n`) AND
 *   Stability-style `GenerateImageParams` (`width`/`height`, `negativePrompt`,
 *   `count`, `steps`). A provider honors ITS dialect and silently ignores the
 *   other's fields — check the bonded provider's docs before relying on anything
 *   beyond `prompt`.
 * - **Handle every result shape, and persist what you must keep.** A
 *   `GeneratedImage` may carry `url`, `base64`, or raw `data` bytes — provider URLs
 *   are typically short-lived, so download and store (e.g. via the uploads bond)
 *   anything the app needs to keep.
 * - **Server-side only, gated and budgeted.** Keep the provider key on the API;
 *   require auth and rate-limit user-triggered generation — every image is billed.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-image-generation'
 * import { createProvider } from '@molecule/api-ai-image-generation-openai'
 *
 * // Wire at startup. See the bond package for its config/env (e.g. OPENAI_API_KEY).
 * setProvider(createProvider())
 *
 * // Use anywhere after startup.
 * const { images } = await requireProvider().generate({
 *   prompt: 'A watercolor fox reading a book',
 *   size: '1024x1024',
 *   responseFormat: 'base64',
 * })
 * // images[0] may carry url, base64, or data — handle what the bonded provider returns.
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
