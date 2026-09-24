/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the real PDFKit bond (pure
 * JS, in-process, no mocks).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { createProvider } from '@molecule/api-pdf-pdfkit'

import { addWatermark, fromTemplate, getPageCount, merge, setProvider } from '../index.js'

describe('README @example', () => {
  it('renders two templated documents, merges, watermarks, and counts pages', async () => {
    setProvider(createProvider({ defaultFontSize: 12 }))

    const invoice = await fromTemplate(
      '<h1>Invoice {{number}}</h1><p>Bill to: {{customer}}</p><p>Total: {{total}}</p>',
      { number: 'INV-1001', customer: 'Ada Lovelace', total: '$120.00' },
      { format: 'A4', margin: { top: '2cm', bottom: '2cm' } },
    )
    const terms = await fromTemplate('<h2>Terms</h2><p>Payable within {{days}} days.</p>', {
      days: 30,
    })

    const draft = await addWatermark(await merge([invoice, terms]), 'DRAFT', { opacity: 0.2 })
    const pages = await getPageCount(draft)

    expect(Buffer.isBuffer(draft)).toBe(true)
    expect(draft.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pages).toBe(2)
  })
})
