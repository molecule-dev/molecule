/**
 * molecule.dev hosted OCR provider for `@molecule/api-ocr`.
 *
 * Extracts text from images on molecule.dev and bills the recognition to your
 * molecule project, so the app needs no OCR vendor account. It is an ordinary
 * bond: swap it for `@molecule/api-ocr-tesseract` (self-hosted, no per-call
 * cost) or `@molecule/api-ocr-llm` (your own AI provider) without changing
 * code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ocr'
 * import { provider as ocr } from '@molecule/api-ocr-molecule'
 *
 * setProvider(ocr) // reads MOLECULE_API_KEY from the environment
 *
 * const result = await requireProvider().recognize({
 *   data: new Uint8Array(imageBytes),
 *   mimeType: 'image/png',
 * })
 * if (result.text.trim()) {
 *   // Index, display or store the recognized text.
 * }
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) with scope `broker` or `broker:ocr`. Optional
 *   `MOLECULE_SERVICES_URL` (default `https://api.molecule.dev/api/v1/services`).
 * - At most 8 MB of image (png, jpeg, webp or gif) per recognition. Larger
 *   scans must be split or downscaled — the service refuses oversized bodies
 *   with 413 rather than resampling them.
 * - `language` is optional and free-form (`en`, `de`, `zh-TW`, "German"): the
 *   hosted service recognizes with a vision model, so any language hint a
 *   model understands works. Omit it for mixed-language images.
 * - Metered per image and billed to the project (spend is the vision model's
 *   token usage on molecule's account). `result.pages[0]` carries no
 *   `confidence` — the model behind the service does not self-score.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 too large, 429 / 503 retry later). Nothing is
 *   retried — an upload pipeline that needs guaranteed extraction should queue
 *   failures for a retry, not drop them.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { OcrProvider } from '@molecule/api-ocr'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: OcrProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: OcrProvider = new Proxy({} as OcrProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
