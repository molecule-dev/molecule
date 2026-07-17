# @molecule/api-ai-document-extraction

`@molecule/api-ai-document-extraction` — feed text + a schema of
fields, get back a structured object via the bonded AI provider.

Extracted from ai-document-processor flagship. For PDF/image inputs,
pre-process with `@molecule/api-pdf` or your OCR provider to get the
`text` argument.

## Quick Start

```ts
import { extractFields, missingRequiredFields } from '@molecule/api-ai-document-extraction'
import type { ExtractionField } from '@molecule/api-ai-document-extraction'

const fields: ExtractionField[] = [
  { name: 'invoice_number', type: 'string', required: true, description: 'The invoice ID/number' },
  { name: 'total_amount', type: 'number', required: true, description: 'Total amount due in cents' },
  { name: 'due_date', type: 'date', description: 'Payment due date' },
  { name: 'vendor', type: 'string', description: 'Vendor / supplier name' },
]

const result = await extractFields({ text: invoiceText, fields, context: 'Invoice from a B2B vendor' })
const missing = missingRequiredFields(result, fields)
if (missing.length) console.warn('Could not extract:', missing)
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-document-extraction @molecule/api-ai @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation
```

## API

### Interfaces

#### `ExtractionField`

A field to extract from a document.

```typescript
interface ExtractionField {
  /** Field name (becomes a JSON key in the result). */
  name: string
  /** Plain-English description of what to extract. */
  description: string
  /** Expected type — hints to the LLM and validates the result. */
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  /** Whether the field is required. Default false. */
  required?: boolean
}
```

#### `ExtractionResult`

Result of a single extraction run.

```typescript
interface ExtractionResult<T = Record<string, unknown>> {
  /** Extracted fields keyed by `field.name`. */
  data: T
  /** AI's confidence per field (0..1). May be partial. */
  confidence?: Partial<Record<keyof T, number>>
  /** Free-form reasoning the AI provided. */
  reasoning?: string
}
```

### Functions

#### `extractFields(opts)`

Extract a set of fields from a document. The AI prompt enumerates
each field with its type and description; the response is validated
and any missing/required fields are flagged.

```typescript
function extractFields(opts: { text: string; fields: ExtractionField[]; context?: string; model?: string; temperature?: number; }): Promise<ExtractionResult<T>>
```

#### `missingRequiredFields(result, fields)`

Validate that all `required` fields were extracted as non-null.
Returns the list of missing field names.

```typescript
function missingRequiredFields(result: ExtractionResult<T>, fields: ExtractionField[]): string[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `@molecule/api-ai` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`

Requires a bonded AI provider: `extractFields` resolves the singleton via
`requireProvider()` from `@molecule/api-ai` — wire your AI bond at startup
(whichever provider bond the app uses) or the call THROWS. It also throws
when multiple named providers are bonded with no default; set the default at
bond time rather than selecting per-call.

The result is BEST-EFFORT and never throws on content: malformed model
output yields `{ data: {}, reasoning: 'AI returned malformed JSON' }`, any
field may be `null`, and `confidence` is optional/partial. ALWAYS validate
with `missingRequiredFields(result, fields)` before trusting `result.data` —
treat a non-empty return as "extraction failed for these fields", not an
exception. `temperature` defaults to 0 for determinism.

Text in, structure out: this package does no OCR/PDF parsing (pre-process
with `@molecule/api-pdf` or your OCR provider) and no chunking — split or
truncate very long documents yourself before calling.
