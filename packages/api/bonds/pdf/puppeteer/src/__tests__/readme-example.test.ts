/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only `puppeteer` (headless Chrome — a native
 * browser a unit test cannot launch) is mocked; its `page.pdf()` returns a real
 * one-page PDF so the pdf-lib side (`getPageCount`) runs for real.
 *
 * @module
 */
const { launch, setContent, pdfCall } = vi.hoisted(() => ({
  launch: vi.fn(),
  setContent: vi.fn(),
  pdfCall: vi.fn(),
}))

vi.mock('puppeteer', () => ({ default: { launch } }))

import { PDFDocument } from 'pdf-lib'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fromTemplate, getPageCount, setProvider } from '@molecule/api-pdf'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(async () => {
    const onePage = await PDFDocument.create()
    onePage.addPage([595.28, 841.89])
    const bytes = await onePage.save()
    setContent.mockResolvedValue(undefined)
    pdfCall.mockResolvedValue(bytes)
    launch.mockResolvedValue({
      connected: true,
      close: vi.fn(),
      newPage: vi.fn().mockResolvedValue({
        setDefaultTimeout: vi.fn(),
        setContent,
        pdf: pdfCall,
        close: vi.fn().mockResolvedValue(undefined),
      }),
    })
  })

  it('renders an escaped template to an A4 PDF with backgrounds and a footer', async () => {
    setProvider(
      createProvider({
        launchArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30_000,
      }),
    )

    const invoice = { number: 'INV-1042', customer: '<Ada & Co>', total: '$120.00' }
    const pdf = await fromTemplate(
      `<style>h1 { color: #1d4ed8 } strong { background: #fef08a }</style>
   <h1>Invoice {{number}}</h1><p>Billed to {{customer}}</p><p>Total: <strong>{{total}}</strong></p>`,
      invoice,
      {
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        footerTemplate: '<div style="font-size:8px;margin:0 auto">Acme Inc. · Invoice</div>',
      },
    )
    const pages = await getPageCount(pdf)

    expect(launch).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const html = String(setContent.mock.calls[0]?.[0])
    expect(html).toContain('<h1>Invoice INV-1042</h1>')
    expect(html).toContain('Billed to &lt;Ada &amp; Co&gt;')
    expect(pdfCall).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      }),
    )
    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pages).toBe(1)
  })
})
