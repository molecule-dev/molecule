/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written, against the real PDFKit + pdf-lib (pure JS —
 * nothing to stub).
 *
 * @module
 */
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'

import { addWatermark, fromTemplate, getPageCount, setProvider } from '@molecule/api-pdf'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('renders a template to a Letter PDF, watermarks it and counts pages', async () => {
    setProvider(createProvider({ defaultFont: 'Helvetica', defaultFontSize: 11 }))

    const invoice = { number: 'INV-1042', customer: { name: 'Ada Lovelace' }, total: '$120.00' }
    const pdf = await fromTemplate(
      '<h1>Invoice {{number}}</h1><p>Billed to <b>{{customer.name}}</b></p><ul><li>Total: {{total}}</li></ul>',
      invoice,
      { format: 'Letter', margin: { top: '1in', bottom: '1in', left: '0.75in', right: '0.75in' } },
    )
    const stamped = await addWatermark(pdf, 'PAID', { fontSize: 72, opacity: 0.2 })
    const pages = await getPageCount(stamped)

    expect(Buffer.isBuffer(stamped)).toBe(true)
    expect(stamped.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(stamped.length).toBeGreaterThan(pdf.length)
    expect(pages).toBe(1)
    const page = (await PDFDocument.load(stamped)).getPage(0)
    expect(page.getWidth()).toBeCloseTo(612)
    expect(page.getHeight()).toBeCloseTo(792)
  })
})
