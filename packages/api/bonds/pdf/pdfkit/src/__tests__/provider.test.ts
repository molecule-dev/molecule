import { PDFDocument } from 'pdf-lib'
import { beforeEach, describe, expect, it } from 'vitest'

import type { PDFProvider } from '@molecule/api-pdf'

import { createProvider, provider as proxyProvider } from '../provider.js'

describe('PDFKit PDF provider', () => {
  let p: PDFProvider

  beforeEach(() => {
    p = createProvider()
  })

  describe('createProvider', () => {
    it('should create a provider with all required PDFProvider methods', () => {
      expect(p.fromHTML).toBeInstanceOf(Function)
      expect(p.fromTemplate).toBeInstanceOf(Function)
      expect(p.merge).toBeInstanceOf(Function)
      expect(p.addWatermark).toBeInstanceOf(Function)
      expect(p.getPageCount).toBeInstanceOf(Function)
      expect(p.getMetadata).toBeInstanceOf(Function)
    })

    it('should create a provider with custom config', () => {
      const custom = createProvider({
        defaultFont: 'Courier',
        defaultFontSize: 14,
        lineHeight: 1.5,
        templateOpenDelimiter: '<%',
        templateCloseDelimiter: '%>',
      })
      expect(custom).toBeDefined()
      expect(custom.fromHTML).toBeInstanceOf(Function)
    })
  })

  describe('fromHTML', () => {
    it('should generate a valid PDF buffer from plain text', async () => {
      const result = await p.fromHTML('Hello World')
      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)

      const doc = await PDFDocument.load(result)
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    })

    it('should generate a PDF from HTML with headings', async () => {
      const result = await p.fromHTML('<h1>Title</h1><p>Body text</p>')
      expect(result).toBeInstanceOf(Buffer)

      const doc = await PDFDocument.load(result)
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    })

    it('should handle nested HTML tags', async () => {
      const html = '<p><b>Bold</b> and <i>italic</i> text</p>'
      const result = await p.fromHTML(html)
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle unordered lists', async () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>'
      const result = await p.fromHTML(html)
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle ordered lists', async () => {
      const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>'
      const result = await p.fromHTML(html)
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle br and hr tags', async () => {
      const html = '<p>Line 1</p><br/><hr/><p>Line 2</p>'
      const result = await p.fromHTML(html)
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should respect page format option', async () => {
      const result = await p.fromHTML('<p>Test</p>', { format: 'Letter' })
      expect(result).toBeInstanceOf(Buffer)

      const doc = await PDFDocument.load(result)
      const page = doc.getPage(0)
      const { width, height } = page.getSize()
      expect(Math.round(width)).toBe(612)
      expect(Math.round(height)).toBe(792)
    })

    it('should respect landscape option', async () => {
      const result = await p.fromHTML('<p>Test</p>', { format: 'A4', landscape: true })
      expect(result).toBeInstanceOf(Buffer)

      const doc = await PDFDocument.load(result)
      const page = doc.getPage(0)
      const { width, height } = page.getSize()
      // Landscape A4: width > height
      expect(width).toBeGreaterThan(height)
    })

    it('should handle margin options', async () => {
      const result = await p.fromHTML('<p>Test</p>', {
        margin: { top: '2cm', bottom: '2cm', left: '1.5cm', right: '1.5cm' },
      })
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle custom width and height', async () => {
      const result = await p.fromHTML('<p>Test</p>', {
        width: '500pt',
        height: '700pt',
      })
      expect(result).toBeInstanceOf(Buffer)

      const doc = await PDFDocument.load(result)
      const page = doc.getPage(0)
      const { width, height } = page.getSize()
      expect(Math.round(width)).toBe(500)
      expect(Math.round(height)).toBe(700)
    })

    it('should decode HTML entities', async () => {
      const result = await p.fromHTML('<p>Tom &amp; Jerry &lt;3&gt;</p>')
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle empty HTML', async () => {
      const result = await p.fromHTML('')
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle multiple heading levels', async () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>'
      const result = await p.fromHTML(html)
      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('fromTemplate', () => {
    it('should interpolate template variables and generate PDF', async () => {
      const result = await p.fromTemplate('<h1>Hello {{ name }}</h1>', { name: 'World' })
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle nested template variables', async () => {
      const result = await p.fromTemplate('<p>{{ user.name }}</p>', {
        user: { name: 'Alice' },
      })
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should support custom delimiters', async () => {
      const custom = createProvider({
        templateOpenDelimiter: '<%',
        templateCloseDelimiter: '%>',
      })
      const result = await custom.fromTemplate('<h1><% title %></h1>', { title: 'Custom' })
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should replace missing variables with empty string', async () => {
      const result = await p.fromTemplate('<p>{{ missing }}</p>', {})
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle data with null/undefined values', async () => {
      const result = await p.fromTemplate('<p>{{ val }}</p>', { val: null })
      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('merge', () => {
    it('should merge multiple PDF buffers into one', async () => {
      const doc1 = await PDFDocument.create()
      doc1.addPage()
      const bytes1 = await doc1.save()

      const doc2 = await PDFDocument.create()
      doc2.addPage()
      doc2.addPage()
      const bytes2 = await doc2.save()

      const result = await p.merge([Buffer.from(bytes1), Buffer.from(bytes2)])
      expect(result).toBeInstanceOf(Buffer)

      const merged = await PDFDocument.load(result)
      expect(merged.getPageCount()).toBe(3)
    })

    it('should handle single PDF input', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const result = await p.merge([Buffer.from(bytes)])
      const merged = await PDFDocument.load(result)
      expect(merged.getPageCount()).toBe(1)
    })

    it('should handle empty array', async () => {
      const result = await p.merge([])
      expect(result).toBeInstanceOf(Buffer)

      const merged = await PDFDocument.load(result)
      expect(merged.getPageCount()).toBeLessThanOrEqual(1)
    })
  })

  describe('addWatermark', () => {
    it('should add a watermark to every page', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      doc.addPage()
      const bytes = await doc.save()

      const result = await p.addWatermark(Buffer.from(bytes), 'DRAFT')
      expect(result).toBeInstanceOf(Buffer)

      const watermarked = await PDFDocument.load(result)
      expect(watermarked.getPageCount()).toBe(2)
    })

    it('should accept custom watermark options', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const result = await p.addWatermark(Buffer.from(bytes), 'CONFIDENTIAL', {
        fontSize: 72,
        color: '#ff0000',
        rotation: -30,
        opacity: 0.5,
      })
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle rgba color values', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const result = await p.addWatermark(Buffer.from(bytes), 'TEST', {
        color: 'rgba(255, 0, 0, 0.3)',
      })
      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('getPageCount', () => {
    it('should return the correct page count', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      doc.addPage()
      doc.addPage()
      const bytes = await doc.save()

      const count = await p.getPageCount(Buffer.from(bytes))
      expect(count).toBe(3)
    })

    it('should return page count for single-page PDF', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const count = await p.getPageCount(Buffer.from(bytes))
      expect(count).toBe(1)
    })
  })

  describe('getMetadata', () => {
    it('should extract metadata from a PDF', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      doc.setTitle('Test Document')
      doc.setAuthor('Test Author')
      doc.setSubject('Test Subject')
      doc.setCreator('Test Creator')
      const bytes = await doc.save()

      const meta = await p.getMetadata!(Buffer.from(bytes))
      expect(meta.pageCount).toBe(1)
      expect(meta.title).toBe('Test Document')
      expect(meta.author).toBe('Test Author')
      expect(meta.subject).toBe('Test Subject')
      expect(meta.creator).toBe('Test Creator')
    })

    it('should handle PDF without metadata', async () => {
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const meta = await p.getMetadata!(Buffer.from(bytes))
      expect(meta.pageCount).toBe(1)
      expect(meta.title).toBeUndefined()
      expect(meta.author).toBeUndefined()
    })
  })

  describe('fromHTML with provider fromTemplate integration', () => {
    it('should generate valid PDFs that can be merged', async () => {
      const pdf1 = await p.fromHTML('<h1>Page 1</h1>')
      const pdf2 = await p.fromHTML('<h1>Page 2</h1>')

      const merged = await p.merge([pdf1, pdf2])
      const doc = await PDFDocument.load(merged)
      expect(doc.getPageCount()).toBe(2)
    })

    it('should generate PDFs that can receive watermarks', async () => {
      const pdf = await p.fromHTML('<h1>Original</h1>')
      const watermarked = await p.addWatermark(pdf, 'SAMPLE')

      const doc = await PDFDocument.load(watermarked)
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    })
  })

  describe('proxy provider', () => {
    it('should expose all PDFProvider methods via proxy', () => {
      expect(proxyProvider.fromHTML).toBeInstanceOf(Function)
      expect(proxyProvider.fromTemplate).toBeInstanceOf(Function)
      expect(proxyProvider.merge).toBeInstanceOf(Function)
      expect(proxyProvider.addWatermark).toBeInstanceOf(Function)
      expect(proxyProvider.getPageCount).toBeInstanceOf(Function)
      expect(proxyProvider.getMetadata).toBeInstanceOf(Function)
    })

    it('should lazily initialize and work', async () => {
      const result = await proxyProvider.fromHTML('<p>Lazy init test</p>')
      expect(result).toBeInstanceOf(Buffer)
    })
  })
})
