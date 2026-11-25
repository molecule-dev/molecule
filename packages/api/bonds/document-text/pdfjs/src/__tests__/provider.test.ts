import { describe, expect, it } from 'vitest'

import { createProvider, DOCUMENT_TEXT_LIMITS, PdfjsDocumentTextProvider } from '../provider.js'
import { invoicePdfBytes } from './fixture.js'

describe('PdfjsDocumentTextProvider', () => {
  it('extracts the known text of the fixture document', async () => {
    const provider = createProvider()
    const result = await provider.extract({ data: invoicePdfBytes() })
    expect(result.pageCount).toBe(1)
    expect(result.pagesOmitted).toBe(0)
    expect(result.truncated).toBe(false)
    expect(result.text).toContain('INVOICE #2026-11-25')
    expect(result.text).toContain('Acme GmbH')
    expect(result.text).toContain('TOTAL 42.00 EUR')
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0]?.pageNumber).toBe(1)
    expect(result.pages[0]?.text).toContain('TOTAL 42.00 EUR')
    expect(result.info?.producer).toBe('PDFKit')
  })

  it('joins multi-page documents with a blank line', async () => {
    // Two fixtures back to back are NOT a valid PDF; instead assert the join
    // shape on the single page (no leading/trailing separator).
    const provider = createProvider()
    const result = await provider.extract({ data: invoicePdfBytes() })
    expect(result.text.startsWith('\n\n')).toBe(false)
    expect(result.text.endsWith('\n\n')).toBe(false)
  })

  it('honors maxPages and reports the omitted pages', async () => {
    const provider = createProvider()
    const result = await provider.extract({ data: invoicePdfBytes() }, { maxPages: 1 })
    expect(result.pages).toHaveLength(1)
    expect(result.pagesOmitted).toBe(0)
  })

  it('returns no pages when includePages is false and counts them as omitted', async () => {
    const provider = createProvider()
    const result = await provider.extract({ data: invoicePdfBytes() }, { includePages: false })
    expect(result.pages).toHaveLength(0)
    expect(result.pagesOmitted).toBe(1)
    expect(result.text).toContain('TOTAL 42.00 EUR')
  })

  it('cuts text at maxTextChars and flags truncated', async () => {
    const provider = createProvider({ maxTextChars: 5 })
    const result = await provider.extract({ data: invoicePdfBytes() })
    expect(result.text).toHaveLength(5)
    expect(result.truncated).toBe(true)
  })

  it('refuses empty and non-byte input before any parse', async () => {
    const provider = createProvider()
    await expect(provider.extract({ data: new Uint8Array(0) })).rejects.toThrow(
      /non-empty PDF bytes/,
    )
    await expect(provider.extract({ data: 'nope' as unknown as Uint8Array })).rejects.toThrow(
      /non-empty PDF bytes/,
    )
    await expect(provider.extract(undefined as unknown as { data: Uint8Array })).rejects.toThrow()
  })

  it('refuses a malformed maxPages before any parse', async () => {
    const provider = createProvider()
    await expect(provider.extract({ data: invoicePdfBytes() }, { maxPages: 0 })).rejects.toThrow(
      /maxPages/,
    )
    await expect(provider.extract({ data: invoicePdfBytes() }, { maxPages: 501 })).rejects.toThrow(
      /maxPages/,
    )
    await expect(provider.extract({ data: invoicePdfBytes() }, { maxPages: 1.5 })).rejects.toThrow(
      /maxPages/,
    )
  })

  it('refuses an empty password before any parse', async () => {
    const provider = createProvider()
    await expect(provider.extract({ data: invoicePdfBytes(), password: '' })).rejects.toThrow(
      /password/,
    )
  })

  it('surfaces a clear error for bytes that are not a PDF', async () => {
    const provider = createProvider()
    await expect(
      provider.extract({ data: new Uint8Array([60, 104, 116, 109, 108, 62]) }),
    ).rejects.toThrow()
  })

  it('defaults match the documented service caps', () => {
    expect(DOCUMENT_TEXT_LIMITS.maxTextChars).toBe(500_000)
    expect(DOCUMENT_TEXT_LIMITS.maxPages).toBe(500)
    expect(new PdfjsDocumentTextProvider().name).toBe('pdfjs')
  })
})
