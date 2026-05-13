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
 *
 * const fields = [
 *   { name: 'invoice_number', type: 'string', required: true, description: 'The invoice ID/number' },
 *   { name: 'total_amount', type: 'number', required: true, description: 'Total amount due in cents' },
 *   { name: 'due_date', type: 'date', description: 'Payment due date' },
 *   { name: 'vendor', type: 'string', description: 'Vendor / supplier name' },
 * ] as const
 *
 * const result = await extractFields({ text: invoiceText, fields, context: 'Invoice from a B2B vendor' })
 * const missing = missingRequiredFields(result, fields)
 * if (missing.length) console.warn('Could not extract:', missing)
 * ```
 *
 * @module
 */

export * from './pipeline.js'
export * from './types.js'
