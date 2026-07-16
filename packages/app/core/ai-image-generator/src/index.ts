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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Entering a prompt and generating renders the resulting
 *   `GeneratedImage`(s) as real pixels on screen: the `image` / `done` events
 *   deliver objects whose `url` loads to a visible picture, not a broken or
 *   placeholder tile.
 * - [ ] A generating indicator shows while the request is in flight — driven
 *   by the `started` / `progress` (`progress.percent`) events — and clears
 *   when `done` fires and `generate()` resolves; it never spins forever.
 * - [ ] A generation failure surfaces visibly: the `error` event's `message`
 *   (provider failure, or a moderation-rejected prompt) renders as a message
 *   in the UI, never a silent no-op or a stuck spinner.
 * - [ ] When the request sets `count` > 1 (bounded 1–10), ALL requested images
 *   render — the `done` event's `images` array length matches what was asked,
 *   not just the first one.
 * - [ ] The request's `size` preset (e.g. `'1024x1024'` vs `'1792x1024'`) is
 *   honored in the output: the rendered image's `width` / `height` match the
 *   requested dimensions rather than a default square.
 * - [ ] The generated image is usable downstream as the app wires it
 *   (insert / download / select), carrying the real `GeneratedImage` data
 *   (`id`, `url`); because `url` may be temporary, an image kept in a gallery
 *   still loads after a full reload — proving the app persisted the bytes, not
 *   a dead upstream link.
 * - [ ] Generations are scoped to the requesting user: `loadHistory` / the
 *   gallery returns only that user's own images, and a moderation-rejected
 *   prompt shows the rejection rather than a blank tile.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
