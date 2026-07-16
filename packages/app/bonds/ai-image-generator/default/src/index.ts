/**
 * Default HTTP image generator provider for molecule.dev — generates images
 * through YOUR backend endpoint (JSON or SSE), with history load/delete.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-ai-image-generator'
 * import { provider } from '@molecule/app-ai-image-generator-default'
 *
 * setProvider(provider) // custom baseUrl/headers: setProvider(createProvider({...}))
 * ```
 *
 * @remarks
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
