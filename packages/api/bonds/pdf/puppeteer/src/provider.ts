/**
 * Puppeteer implementation of PDFProvider.
 *
 * Uses headless Chrome via Puppeteer for high-fidelity HTML-to-PDF rendering
 * and pdf-lib for PDF manipulation (merge, watermark, page count, metadata).
 *
 * @module
 */

import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { Browser, LaunchOptions, PDFOptions as PuppeteerPDFOptions } from 'puppeteer'
import puppeteer from 'puppeteer'

import type {
  PDFMetadata,
  PDFOptions,
  PDFProvider,
  RenderOptions,
  WatermarkOptions,
} from '@molecule/api-pdf'

import type { PuppeteerPDFConfig } from './types.js'

/**
 * Converts molecule PDFOptions to Puppeteer's native PDF options.
 *
 * @param options - The molecule PDF options.
 * @returns Puppeteer-compatible PDF options.
 */
const toPuppeteerOptions = (options?: PDFOptions): PuppeteerPDFOptions => {
  if (!options) return { format: 'A4' }

  const result: PuppeteerPDFOptions = {}

  if (options.format) {
    result.format = options.format
  } else {
    result.format = 'A4'
  }

  if (options.landscape !== undefined) {
    result.landscape = options.landscape
  }

  if (options.margin) {
    result.margin = {
      top: options.margin.top,
      right: options.margin.right,
      bottom: options.margin.bottom,
      left: options.margin.left,
    }
  }

  if (options.headerTemplate) {
    result.headerTemplate = options.headerTemplate
    result.displayHeaderFooter = true
  }

  if (options.footerTemplate) {
    result.footerTemplate = options.footerTemplate
    result.displayHeaderFooter = true
  }

  if (options.printBackground !== undefined) {
    result.printBackground = options.printBackground
  }

  if (options.width) {
    result.width = options.width
  }

  if (options.height) {
    result.height = options.height
  }

  if (options.pageRanges) {
    result.pageRanges = options.pageRanges
  }

  if (options.scale !== undefined) {
    result.scale = options.scale
  }

  return result
}

/**
 * Interpolates simple `{{key}}` placeholders in a template string.
 *
 * @param template - The template string with `{{key}}` placeholders.
 * @param data - Key-value pairs for interpolation.
 * @param openDelimiter - Opening delimiter. Defaults to `'{{'`.
 * @param closeDelimiter - Closing delimiter. Defaults to `'}}'`.
 * @returns The interpolated string.
 */
const interpolateTemplate = (
  template: string,
  data: Record<string, unknown>,
  openDelimiter: string,
  closeDelimiter: string,
): string => {
  const escapedOpen = openDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedClose = closeDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`${escapedOpen}\\s*(\\w+(?:\\.\\w+)*)\\s*${escapedClose}`, 'g')

  return template.replace(pattern, (_, key: string) => {
    const parts = key.split('.')
    let value: unknown = data
    for (const part of parts) {
      if (value == null || typeof value !== 'object') return ''
      value = (value as Record<string, unknown>)[part]
    }
    return value == null ? '' : String(value)
  })
}

/**
 * Parses a CSS color string to pdf-lib RGB values with opacity.
 *
 * @param color - CSS color string (e.g., `'rgba(0, 0, 0, 0.15)'`, `'#ff0000'`).
 * @returns An object with `r`, `g`, `b` values (0–1) and `opacity` (0–1).
 */
const parseColor = (color: string): { r: number; g: number; b: number; opacity: number } => {
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10) / 255,
      g: parseInt(rgbaMatch[2], 10) / 255,
      b: parseInt(rgbaMatch[3], 10) / 255,
      opacity: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    }
  }

  const hexMatch = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/)
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16) / 255,
      g: parseInt(hexMatch[2], 16) / 255,
      b: parseInt(hexMatch[3], 16) / 255,
      opacity: 1,
    }
  }

  return { r: 0, g: 0, b: 0, opacity: 0.15 }
}

/**
 * Creates a Puppeteer-backed PDF provider.
 *
 * @param config - Optional provider configuration (launch args, executable path, etc.).
 * @returns A `PDFProvider` backed by Puppeteer and pdf-lib.
 */
export const createProvider = (config?: PuppeteerPDFConfig): PDFProvider => {
  const timeout = config?.timeout ?? 30_000
  const reuseBrowser = config?.reuseBrowser ?? true
  const openDelimiter = config?.templateOpenDelimiter ?? '{{'
  const closeDelimiter = config?.templateCloseDelimiter ?? '}}'

  let browserInstance: Browser | null = null

  const getLaunchOptions = (): LaunchOptions => {
    const options: LaunchOptions = {
      headless: config?.headless !== false,
      args: config?.launchArgs ?? ['--no-sandbox', '--disable-setuid-sandbox'],
    }
    if (config?.executablePath) {
      options.executablePath = config.executablePath
    }
    return options
  }

  const getBrowser = async (): Promise<Browser> => {
    if (reuseBrowser && browserInstance?.connected) {
      return browserInstance
    }
    const browser = await puppeteer.launch(getLaunchOptions())
    if (reuseBrowser) {
      browserInstance = browser
    }
    return browser
  }

  const generatePDF = async (html: string, options?: PDFOptions): Promise<Buffer> => {
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
      page.setDefaultTimeout(timeout)
      await page.setContent(html, { waitUntil: 'networkidle0', timeout })
      const pdfUint8Array = await page.pdf(toPuppeteerOptions(options))
      return Buffer.from(pdfUint8Array)
    } finally {
      await page.close()
      if (!reuseBrowser) {
        await browser.close()
      }
    }
  }

  return {
    async fromHTML(html: string, options?: PDFOptions): Promise<Buffer> {
      return generatePDF(html, options)
    },

    async fromTemplate(
      template: string,
      data: Record<string, unknown>,
      options?: PDFOptions,
    ): Promise<Buffer> {
      const html = interpolateTemplate(template, data, openDelimiter, closeDelimiter)
      return generatePDF(html, options)
    },

    async merge(pdfs: Buffer[]): Promise<Buffer> {
      const mergedDoc = await PDFDocument.create()

      for (const pdfBuffer of pdfs) {
        const srcDoc = await PDFDocument.load(pdfBuffer)
        const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices())
        for (const page of pages) {
          mergedDoc.addPage(page)
        }
      }

      const bytes = await mergedDoc.save()
      return Buffer.from(bytes)
    },

    async addWatermark(pdf: Buffer, text: string, options?: WatermarkOptions): Promise<Buffer> {
      const doc = await PDFDocument.load(pdf)
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const fontSize = options?.fontSize ?? 48
      const rotation = options?.rotation ?? -45
      const opacity = options?.opacity ?? 0.15
      const colorStr = options?.color ?? 'rgba(0, 0, 0, 0.15)'
      const parsed = parseColor(colorStr)
      const color = rgb(parsed.r, parsed.g, parsed.b)
      const finalOpacity = parsed.opacity * opacity

      const pages = doc.getPages()
      for (const page of pages) {
        const { width, height } = page.getSize()
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        const textHeight = font.heightAtSize(fontSize)
        const x = (width - textWidth) / 2
        const y = (height - textHeight) / 2

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color,
          opacity: finalOpacity,
          rotate: degrees(rotation),
        })
      }

      const bytes = await doc.save()
      return Buffer.from(bytes)
    },

    async getPageCount(pdf: Buffer): Promise<number> {
      const doc = await PDFDocument.load(pdf)
      return doc.getPageCount()
    },

    async getMetadata(pdf: Buffer): Promise<PDFMetadata> {
      const doc = await PDFDocument.load(pdf)
      return {
        pageCount: doc.getPageCount(),
        title: doc.getTitle(),
        author: doc.getAuthor(),
        subject: doc.getSubject(),
        creator: doc.getCreator(),
        creationDate: doc.getCreationDate(),
        modificationDate: doc.getModificationDate(),
      }
    },

    async toImages(pdf: Buffer, options?: RenderOptions): Promise<Buffer[]> {
      const doc = await PDFDocument.load(pdf)
      const totalPages = doc.getPageCount()
      const pageNumbers = options?.pages ?? Array.from({ length: totalPages }, (_, i) => i + 1)
      const format = options?.format ?? 'png'
      const dpi = options?.dpi ?? 150
      const quality = options?.quality ?? 80
      const scale = dpi / 96

      const browser = await getBrowser()
      const images: Buffer[] = []

      for (const pageNum of pageNumbers) {
        if (pageNum < 1 || pageNum > totalPages) continue

        const singleDoc = await PDFDocument.create()
        const [copiedPage] = await singleDoc.copyPages(doc, [pageNum - 1])
        singleDoc.addPage(copiedPage)
        const singleBytes = await singleDoc.save()
        const base64Pdf = Buffer.from(singleBytes).toString('base64')

        const { width, height } = copiedPage.getSize()
        const pixelWidth = Math.round(width * scale)
        const pixelHeight = Math.round(height * scale)

        const page = await browser.newPage()
        try {
          await page.setViewport({ width: pixelWidth, height: pixelHeight, deviceScaleFactor: 1 })

          const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { width: ${pixelWidth}px; height: ${pixelHeight}px; overflow: hidden; }
  embed { width: 100%; height: 100%; }
</style></head><body>
  <embed src="data:application/pdf;base64,${base64Pdf}" type="application/pdf" width="${pixelWidth}" height="${pixelHeight}" />
</body></html>`

          await page.setContent(html, { waitUntil: 'networkidle0', timeout })

          const screenshot = await page.screenshot({
            type: format === 'jpeg' ? 'jpeg' : 'png',
            quality: format === 'jpeg' ? quality : undefined,
            clip: { x: 0, y: 0, width: pixelWidth, height: pixelHeight },
          })
          images.push(Buffer.from(screenshot))
        } finally {
          await page.close()
        }
      }

      if (!reuseBrowser) {
        await browser.close()
      }

      return images
    },
  }
}

/**
 * Default Puppeteer PDF provider instance, lazily initialized on first access.
 */
let _provider: PDFProvider | null = null

/**
 * The provider implementation, lazily initialized with default config.
 */
export const provider: PDFProvider = new Proxy({} as PDFProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
