/**
 * `@molecule/api-ai-document-extraction` — feed text + a schema of
 * fields, get back a structured object via the bonded AI provider.
 *
 * Extracted from ai-document-processor flagship. For PDF/image inputs,
 * pre-process with `@molecule/api-pdf` or your OCR provider to get the
 * `text` argument.
 *
 * @example
 * ```ts
 * import { extractFields, missingRequiredFields } from '@molecule/api-ai-document-extraction'
 * import type { ExtractionField } from '@molecule/api-ai-document-extraction'
 *
 * const fields: ExtractionField[] = [
 *   { name: 'invoice_number', type: 'string', required: true, description: 'The invoice ID/number' },
 *   { name: 'total_amount', type: 'number', required: true, description: 'Total amount due in cents' },
 *   { name: 'due_date', type: 'date', description: 'Payment due date' },
 *   { name: 'vendor', type: 'string', description: 'Vendor / supplier name' },
 * ]
 *
 * const result = await extractFields({ text: invoiceText, fields, context: 'Invoice from a B2B vendor' })
 * const missing = missingRequiredFields(result, fields)
 * if (missing.length) console.warn('Could not extract:', missing)
 * ```
 *
 * @remarks
 * Requires a bonded AI provider: `extractFields` resolves the singleton via
 * `requireProvider()` from `@molecule/api-ai` — wire your AI bond at startup
 * (whichever provider bond the app uses) or the call THROWS. It also throws
 * when multiple named providers are bonded with no default; set the default at
 * bond time rather than selecting per-call.
 *
 * The result is BEST-EFFORT and never throws on content: malformed model
 * output yields `{ data: {}, reasoning: 'AI returned malformed JSON' }`, any
 * field may be `null`, and `confidence` is optional/partial. ALWAYS validate
 * with `missingRequiredFields(result, fields)` before trusting `result.data` —
 * treat a non-empty return as "extraction failed for these fields", not an
 * exception. `temperature` defaults to 0 for determinism.
 *
 * Text in, structure out: this package does no OCR/PDF parsing (pre-process
 * with `@molecule/api-pdf` or your OCR provider) and no chunking — split or
 * truncate very long documents yourself before calling.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pipeline.js'
export * from './types.js'
