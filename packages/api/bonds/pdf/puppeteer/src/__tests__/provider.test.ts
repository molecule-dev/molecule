import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PDFProvider } from '@molecule/api-pdf'

/**
 * Creates a mock Puppeteer page that captures PDF generation calls.
 *
 * @param pdfBytes - Optional bytes to return from `page.pdf()`.
 * @returns A mock page object.
 */
const createMockPage = (
  pdfBytes?: Uint8Array,
): {
  setDefaultTimeout: ReturnType<typeof vi.fn>
  setContent: ReturnType<typeof vi.fn>
  pdf: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  setViewport: ReturnType<typeof vi.fn>
  screenshot: ReturnType<typeof vi.fn>
} => ({
  setDefaultTimeout: vi.fn(),
  setContent: vi.fn().mockResolvedValue(undefined),
  pdf: vi.fn().mockResolvedValue(pdfBytes ?? new Uint8Array([37, 80, 68, 70])),
  close: vi.fn().mockResolvedValue(undefined),
  setViewport: vi.fn().mockResolvedValue(undefined),
  screenshot: vi.fn().mockResolvedValue(Buffer.from([137, 80, 78, 71])),
})

type MockPage = ReturnType<typeof createMockPage>

/**
 * Creates a mock Puppeteer browser that returns the given mock page.
 *
 * @param page - The mock page to return from `browser.newPage()`.
 * @returns A mock browser object.
 */
const createMockBrowser = (
  page: MockPage,
): {
  newPage: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  connected: boolean
} => ({
  newPage: vi.fn().mockResolvedValue(page),
  close: vi.fn().mockResolvedValue(undefined),
  connected: true,
})

type MockBrowser = ReturnType<typeof createMockBrowser>

vi.mock('puppeteer', () => {
  const mockPage = createMockPage()
  const mockBrowser = createMockBrowser(mockPage)

  return {
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
    __mockPage: mockPage,
    __mockBrowser: mockBrowser,
  }
})

/** Helper to get the mock browser from the puppeteer module. */
const getMockBrowserAndPage = async (): Promise<{
  browser: MockBrowser
  page: MockPage
}> => {
  const puppeteerMod = await import('puppeteer')
  const browser = (await (
    puppeteerMod.default as unknown as {
      launch: () => Promise<MockBrowser>
    }
  ).launch()) as MockBrowser
  const page = (await (browser.newPage as () => Promise<MockPage>)()) as MockPage
  return { browser, page }
}

describe('puppeteer PDF provider', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let createProviderFn: Awaited<typeof import('../provider.js')>['createProvider']
  let providerExport: PDFProvider

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../provider.js')
    createProviderFn = mod.createProvider
    providerExport = mod.provider
  })

  describe('createProvider', () => {
    it('should create a provider with all required PDFProvider methods', () => {
      const p = createProviderFn()
      expect(p.fromHTML).toBeInstanceOf(Function)
      expect(p.fromTemplate).toBeInstanceOf(Function)
      expect(p.merge).toBeInstanceOf(Function)
      expect(p.addWatermark).toBeInstanceOf(Function)
      expect(p.getPageCount).toBeInstanceOf(Function)
      expect(p.getMetadata).toBeInstanceOf(Function)
      expect(p.toImages).toBeInstanceOf(Function)
    })

    it('should create a provider with custom config', () => {
      const p = createProviderFn({
        timeout: 60_000,
        headless: true,
        reuseBrowser: false,
        launchArgs: ['--no-sandbox'],
        templateOpenDelimiter: '<%',
        templateCloseDelimiter: '%>',
      })
      expect(p).toBeDefined()
      expect(p.fromHTML).toBeInstanceOf(Function)
    })
  })

  describe('fromHTML', () => {
    it('should generate a PDF buffer from HTML', async () => {
      const p = createProviderFn()
      const result = await p.fromHTML('<h1>Hello</h1>')
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should pass options to Puppeteer', async () => {
      const p = createProviderFn()
      await p.fromHTML('<h1>Hello</h1>', {
        format: 'Letter',
        landscape: true,
        margin: { top: '1cm', bottom: '1cm' },
        printBackground: true,
        scale: 0.8,
      })

      const { page } = await getMockBrowserAndPage()
      expect(page.pdf).toHaveBeenCalled()
    })

    it('should handle header and footer templates', async () => {
      const p = createProviderFn()
      await p.fromHTML('<h1>Hello</h1>', {
        headerTemplate: '<div>Header</div>',
        footerTemplate: '<div>Footer</div>',
      })

      const { page } = await getMockBrowserAndPage()
      const pdfCall = page.pdf.mock.calls[0]?.[0] as Record<string, unknown> | undefined
      expect(pdfCall).toBeDefined()
      if (pdfCall) {
        expect(pdfCall.displayHeaderFooter).toBe(true)
      }
    })
  })

  describe('fromTemplate', () => {
    it('should interpolate template variables and generate PDF', async () => {
      const p = createProviderFn()
      await p.fromTemplate('<h1>Hello {{ name }}</h1>', { name: 'World' })

      const { page } = await getMockBrowserAndPage()
      const setContentCall = page.setContent.mock.calls[0] as unknown[] | undefined
      expect(setContentCall).toBeDefined()
      if (setContentCall) {
        expect(setContentCall[0]).toBe('<h1>Hello World</h1>')
      }
    })

    it('should handle nested template variables', async () => {
      const p = createProviderFn()
      await p.fromTemplate('<p>{{ user.name }}</p>', {
        user: { name: 'Alice' },
      })

      const { page } = await getMockBrowserAndPage()
      const setContentCall = page.setContent.mock.calls[0] as unknown[] | undefined
      expect(setContentCall).toBeDefined()
      if (setContentCall) {
        expect(setContentCall[0]).toBe('<p>Alice</p>')
      }
    })

    it('should support custom delimiters', async () => {
      const p = createProviderFn({
        templateOpenDelimiter: '<%',
        templateCloseDelimiter: '%>',
      })
      await p.fromTemplate('<h1><% title %></h1>', { title: 'Custom' })

      const { page } = await getMockBrowserAndPage()
      const setContentCall = page.setContent.mock.calls[0] as unknown[] | undefined
      expect(setContentCall).toBeDefined()
      if (setContentCall) {
        expect(setContentCall[0]).toBe('<h1>Custom</h1>')
      }
    })

    it('should replace missing variables with empty string', async () => {
      const p = createProviderFn()
      await p.fromTemplate('<p>{{ missing }}</p>', {})

      const { page } = await getMockBrowserAndPage()
      const setContentCall = page.setContent.mock.calls[0] as unknown[] | undefined
      expect(setContentCall).toBeDefined()
      if (setContentCall) {
        expect(setContentCall[0]).toBe('<p></p>')
      }
    })
  })

  describe('merge', () => {
    it('should merge multiple PDF buffers into one', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc1 = await PDFDocument.create()
      doc1.addPage()
      const bytes1 = await doc1.save()

      const doc2 = await PDFDocument.create()
      doc2.addPage()
      doc2.addPage()
      const bytes2 = await doc2.save()

      const p = createProviderFn()
      const result = await p.merge([Buffer.from(bytes1), Buffer.from(bytes2)])

      expect(result).toBeInstanceOf(Buffer)
      const merged = await PDFDocument.load(result)
      expect(merged.getPageCount()).toBe(3)
    })

    it('should handle single PDF input', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const p = createProviderFn()
      const result = await p.merge([Buffer.from(bytes)])

      const merged = await PDFDocument.load(result)
      expect(merged.getPageCount()).toBe(1)
    })

    it('should handle empty array', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const p = createProviderFn()
      const result = await p.merge([])

      expect(result).toBeInstanceOf(Buffer)
      const merged = await PDFDocument.load(result)
      // PDFDocument.create() produces a minimal valid PDF with no pages
      expect(merged.getPageCount()).toBeLessThanOrEqual(1)
    })
  })

  describe('addWatermark', () => {
    it('should add a watermark to every page', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      doc.addPage()
      const bytes = await doc.save()

      const p = createProviderFn()
      const result = await p.addWatermark(Buffer.from(bytes), 'DRAFT')

      expect(result).toBeInstanceOf(Buffer)
      const watermarked = await PDFDocument.load(result)
      expect(watermarked.getPageCount()).toBe(2)
    })

    it('should accept custom watermark options', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const p = createProviderFn()
      const result = await p.addWatermark(Buffer.from(bytes), 'CONFIDENTIAL', {
        fontSize: 72,
        color: '#ff0000',
        rotation: -30,
        opacity: 0.5,
      })

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle rgba color values', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const p = createProviderFn()
      const result = await p.addWatermark(Buffer.from(bytes), 'TEST', {
        color: 'rgba(255, 0, 0, 0.3)',
      })

      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('getPageCount', () => {
    it('should return the correct page count', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      doc.addPage()
      doc.addPage()
      const bytes = await doc.save()

      const p = createProviderFn()
      const count = await p.getPageCount(Buffer.from(bytes))
      expect(count).toBe(3)
    })

    it('should return page count for single-page PDF', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const p = createProviderFn()
      const count = await p.getPageCount(Buffer.from(bytes))
      expect(count).toBe(1)
    })
  })

  describe('getMetadata', () => {
    it('should extract metadata from a PDF', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      doc.setTitle('Test Document')
      doc.setAuthor('Test Author')
      doc.setSubject('Test Subject')
      doc.setCreator('Test Creator')
      const bytes = await doc.save()

      const p = createProviderFn()
      const meta = await p.getMetadata!(Buffer.from(bytes))
      expect(meta.pageCount).toBe(1)
      expect(meta.title).toBe('Test Document')
      expect(meta.author).toBe('Test Author')
      expect(meta.subject).toBe('Test Subject')
      expect(meta.creator).toBe('Test Creator')
    })

    it('should handle PDF without metadata', async () => {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage()
      const bytes = await doc.save()

      const p = createProviderFn()
      const meta = await p.getMetadata!(Buffer.from(bytes))
      expect(meta.pageCount).toBe(1)
      expect(meta.title).toBeUndefined()
      expect(meta.author).toBeUndefined()
    })
  })

  describe('proxy provider', () => {
    it('should expose all PDFProvider methods via proxy', () => {
      expect(providerExport.fromHTML).toBeInstanceOf(Function)
      expect(providerExport.fromTemplate).toBeInstanceOf(Function)
      expect(providerExport.merge).toBeInstanceOf(Function)
      expect(providerExport.addWatermark).toBeInstanceOf(Function)
      expect(providerExport.getPageCount).toBeInstanceOf(Function)
      expect(providerExport.getMetadata).toBeInstanceOf(Function)
      expect(providerExport.toImages).toBeInstanceOf(Function)
    })
  })
})
