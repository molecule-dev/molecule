/**
 * `@molecule/api-ai-document-extraction` — feed text + a schema of
 * fields, get back a structured object via the bonded AI provider.
 *
 * Extracted from ai-document-processor flagship. For PDF/image inputs,
 * pre-process with `@molecule/api-pdf` or your OCR provider to get the
 * `text` argument.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-ai'
 * import { createProvider } from '@molecule/api-ai-anthropic'
 * import type { ExtractionField } from '@molecule/api-ai-document-extraction'
 * import { extractFields, missingRequiredFields } from '@molecule/api-ai-document-extraction'
 *
 * // Startup (server only): bond the AI provider the pipeline calls.
 * setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
 *
 * const invoiceText = 'ACME Corp — Invoice INV-2041. Total due: $1,250.00 by 2026-10-01.'
 * const fields: ExtractionField[] = [
 *   { name: 'invoice_number', type: 'string', required: true, description: 'The invoice ID/number' },
 *   { name: 'total_amount', type: 'number', required: true, description: 'Total due in cents' },
 *   { name: 'due_date', type: 'date', description: 'Payment due date (YYYY-MM-DD)' },
 *   { name: 'vendor', type: 'string', description: 'Vendor / supplier name' },
 * ]
 *
 * const result = await extractFields<{ invoice_number: string; total_amount: number }>({
 *   text: invoiceText,
 *   fields,
 *   context: 'Invoice from a B2B vendor',
 * })
 * const missing = missingRequiredFields(result, fields) // [] when both required fields came back
 * if (missing.length > 0) throw new Error(`Could not extract: ${missing.join(', ')}`)
 * console.log(result.data.invoice_number, result.data.total_amount) // 'INV-2041' 125000
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
