/**
 * Default HTTP image generator provider for molecule.dev — generates images
 * through YOUR backend endpoint (JSON or SSE), with history load/delete.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-image-generator'
 * import { createProvider } from '@molecule/app-ai-image-generator-default'
 *
 * // Startup: bond once. `baseUrl` '' (default) = same origin; the image-model key stays on YOUR API.
 * setProvider(createProvider({ baseUrl: '', headers: { 'X-Client': 'web' } }))
 *
 * // Anywhere: generate through the core provider.
 * const generator = requireProvider()
 * const config = { endpoint: '/api/images/generate' }
 *
 * const images = await generator.generate(
 *   { prompt: 'A lighthouse at dusk, watercolor', size: '1024x1024', count: 1 },
 *   config,
 *   (event) => {
 *     if (event.type === 'progress') console.log(`${event.percent}%`)
 *     if (event.type === 'error') console.error(event.message) // generate() resolves [] on failure
 *   },
 * )
 * const imageUrl = images[0]?.url // render with <img src={imageUrl} />
 *
 * const history = await generator.loadHistory(config) // GET on the same endpoint
 * ```
 *
 * @remarks
 * The core has no top-level `generate()` — call it on `requireProvider()` after
 * `setProvider(...)`, and pass the `ImageGenerationConfig` (required `endpoint`) on every call.
 * The bare `provider` export is `createProvider()` with no options.
 * Talks to YOUR backend at `config.endpoint` — no vendor key in the browser.
 * Server contract: POST `{ prompt, negativePrompt?, size?, count?, format?,
 * quality?, style?, model? }`; reply EITHER as plain JSON
 * `{ images: [{ id, url, prompt, width?, height?, createdAt? }] }` OR as an
 * SSE stream (`Content-Type: text/event-stream`) of
 * `data: <ImageGenerationEvent JSON>` lines (`started` / `progress` /
 * `image` / `done` / `error`) — the bond auto-detects by content type. GET
 * the same endpoint → `{ images }` for history (fails open to `[]`); DELETE
 * `${endpoint}/${id}` removes one image. `generate()` NEVER rejects: on any
 * failure it emits an `error` event and resolves `[]` — drive error UI from
 * the event callback, not try/catch.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
