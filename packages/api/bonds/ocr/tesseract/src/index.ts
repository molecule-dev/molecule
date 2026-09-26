/**
 * Self-hosted Tesseract OCR provider for molecule.dev.
 *
 * Implements the `@molecule/api-ocr` contract with Tesseract running in a
 * worker thread inside your own process — no vendor account, no per-call cost,
 * no egress after a language's traineddata is downloaded once. The eject path
 * when a hosted or model-based OCR bond is more than a high-volume scan job
 * needs.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ocr'
 * import { createProvider } from '@molecule/api-ocr-tesseract'
 *
 * setProvider(createProvider({ language: 'eng' }))
 *
 * const result = await requireProvider().recognize({
 *   data: new Uint8Array(scanBytes),
 *   mimeType: 'image/png',
 * })
 * console.log(result.pages[0].confidence) // Tesseract's own 0–1 mean score
 * await requireProvider().dispose?.()      // end of the batch: free the workers
 * ```
 *
 * @remarks
 * - **CPU-heavy work belongs in a worker process, not your request handler.**
 *   Tesseract runs in its own worker THREAD, so the event loop is not blocked,
 *   a recognition pass still takes seconds of CPU. For a high-volume API, put
 *   the work behind a queue (e.g. `@molecule/api-cron` + a job table), not the
 *   create/update handler.
 * - **`language` is a TESSERACT code, not a BCP-47 tag** — `eng`, `deu`,
 *   `eng+deu`. `en` fails traineddata lookup on first use. The first call in a
 *   new language downloads its traineddata (a few MB, cached in `cachePath`);
 *   point `langPath` at your own mirror for offline installs.
 * - **Recognize at real size.** Tesseract wants ~300 DPI grayscale input; a
 *   200×40 thumbnail of a word returns garbage. Do not downscale before this
 *   bond the way you would before a vision model.
 * - `confidence` is Tesseract's own mean over the page (0–1). Gate on it with
 *   a threshold you calibrated on YOUR scans — clean screenshots score 0.9+,
 *   photos of crumpled paper can score 0.4 and still be mostly right.
 * - No layout model: column order, tables and multi-column pages come out in
 *   reading-order guesses. For table structure, crop cells or use a
 *   vision-model bond and compare.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
