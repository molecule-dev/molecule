/**
 * OCR core interface for molecule.dev.
 *
 * Defines the abstract contract for extracting text from images. Bond a
 * concrete provider to enable OCR in your application — a vision language
 * model (`@molecule/api-ocr-llm`), self-hosted Tesseract
 * (`@molecule/api-ocr-tesseract`), or molecule.dev's hosted service
 * (`@molecule/api-ocr-molecule`).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ocr'
 * import { provider as ocr } from '@molecule/api-ocr-molecule' // or -llm / -tesseract
 *
 * setProvider(ocr)
 *
 * // Use anywhere in the app
 * const result = await requireProvider().recognize({
 *   data: new Uint8Array(imageBytes),
 *   mimeType: 'image/png',
 * })
 * if (result.text.trim()) {
 *   console.log('Recognized:', result.text)
 * }
 * ```
 *
 * @remarks
 * - **Like most cores there are NO module-level convenience delegates.** Call
 *   methods on `requireProvider()` (throws when unbonded). Note `getProvider()`
 *   returns `null` rather than throwing.
 * - **`language` is a HINT, and providers interpret it differently.** A vision
 *   model takes any language name or BCP-47 tag; Tesseract needs its own
 *   traineddata codes (`eng`, not `en`). Passing Tesseract a BCP-47 tag fails
 *   at recognition time — use the code the bonded provider documents.
 * - **One image per call.** Multi-page documents (PDF, multi-page TIFF) are not
 *   in this contract yet — recognize a rendered page image at a time and join
 *   the results yourself.
 * - **Image size is unbounded here, bounded by the provider.** The core never
 *   resizes or re-encodes; each bond documents (and enforces) its own maximum.
 *   Downscale server-side before recognizing a scan you only need the words of.
 * - `confidence` is the provider scoring ITSELF. A vision model returns no
 *   confidence at all — do not gate on it unless your bond fills it (Tesseract
 *   does), and never treat a high score as proof the words are right.
 * - **OCR output is untrusted input.** Recognized text came from an image
 *   anyone could have crafted — treat it like user content: escape before
 *   rendering, moderate before publishing.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
