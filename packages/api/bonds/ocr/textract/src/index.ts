/**
 * AWS Textract OCR provider for molecule.dev.
 *
 * Implements the `@molecule/api-ocr` contract with Amazon Textract's
 * synchronous DetectDocumentText — layout-grade OCR with per-line confidence
 * scoring on AWS's own models, no vision-language model in the loop.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ocr'
 * import { provider } from '@molecule/api-ocr-textract'
 *
 * setProvider(provider) // at startup — lazy; reads AWS_* config on first use
 *
 * const result = await requireProvider().recognize({
 *   data: new Uint8Array(imageBytes),
 *   mimeType: 'image/png',
 * })
 * console.log(result.text, result.pages[0].confidence)
 * ```
 *
 * @remarks
 * - **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
 *   `setProvider(createProvider(config?))` to pass explicit config.
 * - Config: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (required — an IAM key
 *   with `textract:DetectDocumentText`); `AWS_TEXTRACT_REGION` (optional — falls
 *   back to `AWS_REGION`, then `us-east-1`; Textract is not in every region);
 *   `AWS_TEXTRACT_ENDPOINT` (optional endpoint override).
 * - **PNG or JPEG only, up to 5 MB** — the synchronous `Bytes` path's own limits
 *   (AWS's Document type: "The document bytes must be in PNG or JPEG format",
 *   max 5 MB). TIFF/BMP/PDF need Textract's asynchronous APIs, which this bond
 *   does not cover; a wrong format or oversized image is refused locally,
 *   before any upstream call.
 * - **`options.language` is ignored.** DetectDocumentText takes no language
 *   hint: it finds printed text in any language (handwriting support is
 *   limited). Pass a language to bond-specific providers that accept one.
 * - **`confidence` is real here** — the mean of Textract's per-LINE scores
 *   (0–100 normalized to 0–1). Unlike a vision model, Textract scores itself;
 *   treat low scores as a scan-quality signal, not proof of correctness.
 * - The text is assembled from LINE blocks in Textract's reading order, joined
 *   with newlines — paragraph structure and column layout are NOT preserved.
 *   For tables/forms use Textract's AnalyzeDocument APIs directly (not in this
 *   bond).
 * - **Recognized text is untrusted input** — see the `@molecule/api-ocr` core's
 *   remarks: escape before rendering, moderate before publishing.
 * - On hosts whose egress path is an HTTP proxy the SDK's agent is set from
 *   `@molecule/api-proxy-agent` automatically; the AWS SDK otherwise ignores
 *   proxy variables entirely.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
