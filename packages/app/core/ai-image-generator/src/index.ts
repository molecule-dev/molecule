/**
 * AI image generation core interface for molecule.dev.
 *
 * Defines the `AIImageGeneratorProvider` contract for prompt-to-image features:
 * `generate(request, config, onEvent)` streams progress/image/done/error events
 * and resolves with the generated images; `loadHistory` / `deleteImage` manage
 * previously generated images; `abort()` cancels an in-flight generation.
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT
 *   `bond('ai-image-generator', …)`.** This core keeps its own local singleton
 *   and does not read the `@molecule/app-bond` registry; `requireProvider()`
 *   throws until `setProvider()` has run.
 * - **Generation goes through YOUR backend** (`config.endpoint`), which calls
 *   the image model server-side (see `@molecule/api-ai-image-generation`) — the
 *   vendor key never reaches the browser.
 * - **`GeneratedImage.url` may be TEMPORARY** (signed/expiring upstream URLs).
 *   If the app keeps a gallery, have the server download and persist the bytes
 *   (e.g. via the uploads package) and store YOUR url — storing the returned
 *   url alone ships dead links.
 * - `count` is bounded 1–10; generation is slow — drive the UI from the
 *   `progress` / `image` events rather than blocking on the promise alone.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-image-generator'
 * import { createProvider } from '@molecule/app-ai-image-generator-default'
 *
 * setProvider(createProvider()) // at startup
 *
 * const generator = requireProvider()
 * const images = await generator.generate(
 *   { prompt: 'A watercolor fox', size: '1024x1024', count: 1 },
 *   { endpoint: '/api/images/generate' },
 *   (event) => {
 *     if (event.type === 'progress') setProgress(event.percent)
 *     if (event.type === 'error') showError(event.message)
 *   },
 * )
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
