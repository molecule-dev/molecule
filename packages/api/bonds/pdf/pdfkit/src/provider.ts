/**
 * PDFKit implementation of PDFProvider.
 *
 * Uses PDFKit for programmatic PDF generation (fromHTML, fromTemplate) and
 * pdf-lib for PDF manipulation (merge, watermark, page count, metadata).
 *
 * PDFKit generates PDFs programmatically — `fromHTML` performs basic HTML-to-text
 * conversion with rudimentary formatting. For high-fidelity HTML rendering,
 * use `@molecule/api-pdf-puppeteer` instead.
 *
 * @module
 */

import { degrees, PDFDocument as PDFLibDocument, rgb, StandardFonts } from 'pdf-lib'
import PDFDocument from 'pdfkit'

import type { PDFMetadata, PDFOptions, PDFProvider, WatermarkOptions } from '@molecule/api-pdf'

import type { PDFKitConfig } from './types.js'

/**
 * Page dimensions in points for standard page formats.
 */
const PAGE_SIZES: Record<string, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
  Tabloid: [792, 1224],
}

/**
 * Font sizes for HTML heading elements (h1–h6) in points.
 */
const HEADING_SIZES: Record<string, number> = {
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 16,
  h5: 14,
  h6: 12,
}

/**
 * Parses a CSS unit string (e.g., `'1cm'`, `'0.5in'`, `'20px'`, `'36pt'`)
 * to PDF points.
 *
 * @param value - The CSS unit string.
 * @returns The value in points, or `0` if unparseable.
 */
const parseUnits = (value: string): number => {
  const match = value.match(/^([\d.]+)\s*(cm|mm|in|px|pt)?$/)
  if (!match) return 0

  const num = parseFloat(match[1])
  const unit = match[2] ?? 'pt'

  switch (unit) {
    case 'cm':
      return num * 28.3465
    case 'mm':
      return num * 2.83465
    case 'in':
      return num * 72
    case 'px':
      return num * 0.75
    case 'pt':
    default:
      return num
  }
}

/**
 * Represents a parsed HTML node for rendering.
 */
interface HTMLNode {
  /** The tag name (lowercase), or `'text'` for text nodes. */
  tag: string

  /** Text content for text nodes. */
  text?: string

  /** Child nodes. */
  children: HTMLNode[]
}

/**
 * Parses a simple HTML string into a tree of {@link HTMLNode} objects.
 * Handles basic tags: h1–h6, p, br, b, strong, i, em, ul, ol, li, hr.
 *
 * @param html - The HTML string to parse.
 * @returns An array of root-level nodes.
 */
const parseHTML = (html: string): HTMLNode[] => {
  const nodes: HTMLNode[] = []
  const stack: HTMLNode[] = []
  let remaining = html

  while (remaining.length > 0) {
    const tagStart = remaining.indexOf('<')

    if (tagStart === -1) {
      const text = decodeEntities(remaining.trim())
      if (text) {
        const textNode: HTMLNode = { tag: 'text', text, children: [] }
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(textNode)
        } else {
          nodes.push(textNode)
        }
      }
      break
    }

    if (tagStart > 0) {
      const text = decodeEntities(remaining.slice(0, tagStart))
      if (text.trim()) {
        const textNode: HTMLNode = { tag: 'text', text, children: [] }
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(textNode)
        } else {
          nodes.push(textNode)
        }
      }
    }

    const tagEnd = remaining.indexOf('>', tagStart)
    if (tagEnd === -1) break

    const tagContent = remaining.slice(tagStart + 1, tagEnd).trim()
    remaining = remaining.slice(tagEnd + 1)

    if (tagContent.startsWith('/')) {
      // Closing tag
      const closingTag = tagContent.slice(1).trim().toLowerCase()
      let found = false
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === closingTag) {
          stack.splice(i)
          found = true
          break
        }
      }
      if (!found && stack.length > 0) {
        stack.pop()
      }
    } else {
      // Opening or self-closing tag
      const tagNameMatch = tagContent.match(/^(\w+)/)
      if (!tagNameMatch) continue

      const tagName = tagNameMatch[1].toLowerCase()
      const isSelfClosing =
        tagContent.endsWith('/') || tagName === 'br' || tagName === 'hr' || tagName === 'img'

      const node: HTMLNode = { tag: tagName, children: [] }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node)
      } else {
        nodes.push(node)
      }

      if (!isSelfClosing) {
        stack.push(node)
      }
    }
  }

  return nodes
}

/**
 * Decodes common HTML entities.
 *
 * @param text - The text with HTML entities.
 * @returns The decoded text.
 */
const decodeEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Rendering context passed through HTML node rendering.
 */
interface RenderContext {
  /** The PDFKit document instance. */
  doc: InstanceType<typeof PDFDocument>

  /** Default font name. */
  defaultFont: string

  /** Default font size in points. */
  defaultFontSize: number

  /** Whether currently rendering bold text. */
  bold: boolean

  /** Whether currently rendering italic text. */
  italic: boolean

  /** Current list nesting depth. */
  listDepth: number

  /** Current ordered list counter (per depth). */
  listCounter: number

  /** Whether currently inside an ordered list. */
  ordered: boolean
}

/**
 * Returns the appropriate PDFKit font name based on bold/italic flags.
 *
 * @param base - The base font name (e.g., `'Helvetica'`).
 * @param bold - Whether bold styling is active.
 * @param italic - Whether italic styling is active.
 * @returns The font variant name.
 */
const getFontVariant = (base: string, bold: boolean, italic: boolean): string => {
  if (base !== 'Helvetica' && base !== 'Times-Roman' && base !== 'Courier') {
    return base
  }

  if (base === 'Helvetica') {
    if (bold && italic) return 'Helvetica-BoldOblique'
    if (bold) return 'Helvetica-Bold'
    if (italic) return 'Helvetica-Oblique'
    return 'Helvetica'
  }

  if (base === 'Times-Roman') {
    if (bold && italic) return 'Times-BoldItalic'
    if (bold) return 'Times-Bold'
    if (italic) return 'Times-Italic'
    return 'Times-Roman'
  }

  // Courier
  if (bold && italic) return 'Courier-BoldOblique'
  if (bold) return 'Courier-Bold'
  if (italic) return 'Courier-Oblique'
  return 'Courier'
}

/**
 * Renders an array of HTML nodes into a PDFKit document.
 *
 * @param nodes - The parsed HTML nodes.
 * @param ctx - The rendering context.
 */
const renderNodes = (nodes: HTMLNode[], ctx: RenderContext): void => {
  for (const node of nodes) {
    renderNode(node, ctx)
  }
}

/**
 * Renders a single HTML node into the PDFKit document.
 *
 * @param node - The HTML node to render.
 * @param ctx - The rendering context.
 */
const renderNode = (node: HTMLNode, ctx: RenderContext): void => {
  const { doc, defaultFont, defaultFontSize } = ctx

  if (node.tag === 'text') {
    const font = getFontVariant(defaultFont, ctx.bold, ctx.italic)
    doc
      .font(font)
      .fontSize(defaultFontSize)
      .text(node.text ?? '', { continued: false })
    return
  }

  if (node.tag === 'br') {
    doc.moveDown(0.5)
    return
  }

  if (node.tag === 'hr') {
    const y = doc.y
    doc
      .moveTo(doc.page.margins.left, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .stroke()
    doc.moveDown(0.5)
    return
  }

  const headingSize = HEADING_SIZES[node.tag]
  if (headingSize) {
    doc.moveDown(0.3)
    const font = getFontVariant(defaultFont, true, false)
    const text = extractText(node)
    doc.font(font).fontSize(headingSize).text(text)
    doc.font(getFontVariant(defaultFont, ctx.bold, ctx.italic)).fontSize(defaultFontSize)
    doc.moveDown(0.3)
    return
  }

  if (node.tag === 'p') {
    doc.moveDown(0.3)
    renderNodes(node.children, ctx)
    doc.moveDown(0.3)
    return
  }

  if (node.tag === 'b' || node.tag === 'strong') {
    const prevBold = ctx.bold
    ctx.bold = true
    renderNodes(node.children, ctx)
    ctx.bold = prevBold
    return
  }

  if (node.tag === 'i' || node.tag === 'em') {
    const prevItalic = ctx.italic
    ctx.italic = true
    renderNodes(node.children, ctx)
    ctx.italic = prevItalic
    return
  }

  if (node.tag === 'ul' || node.tag === 'ol') {
    const prevOrdered = ctx.ordered
    const prevCounter = ctx.listCounter
    ctx.ordered = node.tag === 'ol'
    ctx.listCounter = 0
    ctx.listDepth++
    renderNodes(node.children, ctx)
    ctx.listDepth--
    ctx.ordered = prevOrdered
    ctx.listCounter = prevCounter
    return
  }

  if (node.tag === 'li') {
    const indent = ctx.listDepth * 20
    ctx.listCounter++
    const bullet = ctx.ordered ? `${String(ctx.listCounter)}. ` : '\u2022 '
    const text = extractText(node)
    const font = getFontVariant(defaultFont, ctx.bold, ctx.italic)
    doc
      .font(font)
      .fontSize(defaultFontSize)
      .text(bullet + text, doc.page.margins.left + indent, undefined, {
        continued: false,
      })
    return
  }

  // For unrecognized tags, render children
  renderNodes(node.children, ctx)
}

/**
 * Recursively extracts all text content from an HTML node tree.
 *
 * @param node - The root node.
 * @returns The concatenated text content.
 */
const extractText = (node: HTMLNode): string => {
  if (node.tag === 'text') return node.text ?? ''
  if (node.tag === 'br') return '\n'
  return node.children.map(extractText).join('')
}

/**
 * Collects PDFKit document output into a Buffer via streaming.
 *
 * @param doc - The PDFKit document instance.
 * @returns A promise that resolves with the PDF buffer.
 */
const docToBuffer = (doc: InstanceType<typeof PDFDocument>): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
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
 * Creates a PDFKit-backed PDF provider.
 *
 * @param config - Optional provider configuration.
 * @returns A `PDFProvider` backed by PDFKit and pdf-lib.
 */
export const createProvider = (config?: PDFKitConfig): PDFProvider => {
  const defaultFont = config?.defaultFont ?? 'Helvetica'
  const defaultFontSize = config?.defaultFontSize ?? 12
  const lineHeight = config?.lineHeight ?? 1.2
  const openDelimiter = config?.templateOpenDelimiter ?? '{{'
  const closeDelimiter = config?.templateCloseDelimiter ?? '}}'

  const createDocument = (options?: PDFOptions): InstanceType<typeof PDFDocument> => {
    const format = options?.format ?? 'A4'
    const size = PAGE_SIZES[format] ?? PAGE_SIZES.A4
    const landscape = options?.landscape ?? false

    const margin = {
      top: options?.margin?.top ? parseUnits(options.margin.top) : 72,
      bottom: options?.margin?.bottom ? parseUnits(options.margin.bottom) : 72,
      left: options?.margin?.left ? parseUnits(options.margin.left) : 72,
      right: options?.margin?.right ? parseUnits(options.margin.right) : 72,
    }

    let width: number | undefined
    let height: number | undefined

    if (options?.width) width = parseUnits(options.width)
    if (options?.height) height = parseUnits(options.height)

    return new PDFDocument({
      size: width && height ? [width, height] : landscape ? [size[1], size[0]] : size,
      margins: margin,
      bufferPages: true,
    })
  }

  const generatePDF = async (html: string, options?: PDFOptions): Promise<Buffer> => {
    const doc = createDocument(options)
    const nodes = parseHTML(html)

    doc.font(defaultFont).fontSize(defaultFontSize)

    const ctx: RenderContext = {
      doc,
      defaultFont,
      defaultFontSize,
      bold: false,
      italic: false,
      listDepth: 0,
      listCounter: 0,
      ordered: false,
    }

    if (lineHeight !== 1.2) {
      doc.lineGap((lineHeight - 1) * defaultFontSize)
    }

    renderNodes(nodes, ctx)

    return docToBuffer(doc)
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
      const mergedDoc = await PDFLibDocument.create()

      for (const pdfBuffer of pdfs) {
        const srcDoc = await PDFLibDocument.load(pdfBuffer)
        const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices())
        for (const page of pages) {
          mergedDoc.addPage(page)
        }
      }

      const bytes = await mergedDoc.save()
      return Buffer.from(bytes)
    },

    async addWatermark(pdf: Buffer, text: string, options?: WatermarkOptions): Promise<Buffer> {
      const doc = await PDFLibDocument.load(pdf)
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
      const doc = await PDFLibDocument.load(pdf)
      return doc.getPageCount()
    },

    async getMetadata(pdf: Buffer): Promise<PDFMetadata> {
      const doc = await PDFLibDocument.load(pdf)
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
  }
}

/**
 * Default PDFKit PDF provider instance, lazily initialized on first access.
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
