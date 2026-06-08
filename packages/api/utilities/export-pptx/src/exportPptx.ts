/**
 * Pure-function PPTX serializer for molecule.dev. Takes a {@link Deck}
 * description and produces a `.pptx` `Buffer` (a ZIP of OOXML parts).
 *
 * Powered by `pptxgenjs` under the hood — the library handles the OOXML
 * plumbing (Content_Types, relationships, slide XML, chart XML, embedded
 * media). This module is the framework-neutral wrapper that:
 *
 * 1. Normalizes the `Deck` shape (defaults, layout selection, image source
 *    resolution).
 * 2. Maps molecule's element types to pptxgenjs calls.
 * 3. Returns a Node `Buffer` regardless of platform — pptxgenjs in Node
 *    yields a `Buffer`, but in older builds it returned `string` for
 *    `'nodebuffer'`, so we normalize.
 *
 * @module
 */

// pptxgenjs's d.ts combines `export as namespace` + `declare class` +
// `declare namespace`, which under NodeNext + esModuleInterop resolves the
// default-imported value to the namespace rather than the constructor.
// Runtime works fine — we just need a typed handle to construct from.
// `Constructor` mirrors only what we use; the slide we get back is typed
// loosely (`PptxSlide`) since pptxgenjs's per-method option shapes
// aren't reachable through the merged namespace at module scope.
import PptxGenJSDefault from 'pptxgenjs'

import type {
  ChartElement,
  Deck,
  ExportPptxOptions,
  ExportPptxResult,
  ImageElement,
  ShapeElement,
  Slide,
  SlideElement,
  TextElement,
  TextStyle,
} from './types.js'

interface PptxLayoutSettable {
  title: string
  author: string
  subject: string
  company: string
  layout: string
  addSlide(): PptxSlide
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  write(props: { outputType: string }): Promise<any>
}

interface PptxSlide {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  background: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addText(text: string | unknown[], options?: any): PptxSlide
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addImage(options: any): PptxSlide
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addShape(shape: string, options?: any): PptxSlide
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addChart(type: string, data: unknown[], options?: any): PptxSlide
  addNotes(notes: string): PptxSlide
}

const PptxGenJS = PptxGenJSDefault as unknown as new () => PptxLayoutSettable

const PPTX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation' as const

/**
 * Serialize a {@link Deck} into a `.pptx` `Buffer`.
 *
 * @param deck - The deck description (slides + metadata).
 * @param options - Optional export tweaks (e.g. filename override).
 * @returns A {@link ExportPptxResult} with the buffer, suggested filename,
 *   and the canonical PPTX MIME type.
 */
export async function exportPptx(
  deck: Deck,
  options: ExportPptxOptions = {},
): Promise<ExportPptxResult> {
  if (!deck || !Array.isArray(deck.slides)) {
    throw new TypeError('exportPptx: deck.slides must be an array')
  }

  const pptx = new PptxGenJS()

  // Apply deck-level metadata.
  if (deck.title) pptx.title = deck.title
  if (deck.author) pptx.author = deck.author
  if (deck.subject) pptx.subject = deck.subject
  if (deck.company) pptx.company = deck.company

  // Pick layout from the first slide that specifies one. Default 16:9.
  const layoutHint = deck.slides.find((s) => s.layout)?.layout ?? 'widescreen'
  pptx.layout = layoutHint === 'standard' ? 'LAYOUT_4x3' : 'LAYOUT_WIDE'

  for (const slide of deck.slides) {
    addSlide(pptx, slide)
  }

  const filename = sanitizeFilename(options.filename ?? deck.title ?? 'deck')

  // pptxgenjs returns Buffer for 'nodebuffer' in Node, but its TS types are
  // permissive — normalize defensively.
  const raw = await pptx.write({ outputType: 'nodebuffer' })
  const buffer = toBuffer(raw)

  return {
    buffer,
    filename,
    contentType: PPTX_CONTENT_TYPE,
  }
}

/**
 * Add a single {@link Slide} to the pptxgenjs presentation. Exported for
 * tests; not part of the public API surface.
 * @param pptx
 * @param slide
 */
function addSlide(pptx: PptxLayoutSettable, slide: Slide): void {
  const s = pptx.addSlide()

  if (slide.background) {
    s.background = { color: stripHash(slide.background) }
  }
  if (slide.notes) {
    s.addNotes(slide.notes)
  }

  for (const element of slide.elements ?? []) {
    addElement(s, element)
  }
}

/**
 * Dispatch one element onto the slide.
 * @param slide
 * @param element
 */
function addElement(slide: PptxSlide, element: SlideElement): void {
  switch (element.kind) {
    case 'text':
      addText(slide, element)
      break
    case 'image':
      addImage(slide, element)
      break
    case 'shape':
      addShape(slide, element)
      break
    case 'chart':
      addChart(slide, element)
      break
    default: {
      // Exhaustiveness guard — narrows to never if all kinds handled.
      const _exhaustive: never = element
      throw new Error(`Unknown element kind: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/**
 * Render a text element onto a slide, splitting body newlines into paragraph runs.
 * @param slide
 * @param element
 */
function addText(slide: PptxSlide, element: TextElement): void {
  // Split body on newlines into paragraph runs so multi-line text renders
  // as separate paragraphs (matching most editor expectations).
  const paragraphs = element.body.split('\n').map((line, i, arr) => ({
    text: line,
    options: i < arr.length - 1 ? { breakLine: true } : {},
  }))

  slide.addText(paragraphs, {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    ...textStyleToPptx(element),
  })
}

/**
 * Render an image element onto a slide, resolving src/data/buffer to a pptxgenjs image option.
 * @param slide
 * @param element
 */
function addImage(slide: PptxSlide, element: ImageElement): void {
  const sources = [element.src, element.data, element.buffer].filter((v) => v !== undefined)
  if (sources.length === 0) {
    throw new Error('image element requires one of: src, data, buffer')
  }
  if (sources.length > 1) {
    throw new Error('image element accepts only one of: src, data, buffer')
  }

  const opts: Record<string, unknown> = {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    altText: element.altText,
  }

  if (element.src !== undefined) {
    // pptxgenjs accepts a URL or a local file path via `path`.
    opts['path'] = element.src
  } else if (element.data !== undefined) {
    opts['data'] = normalizeImageDataUri(element.data)
  } else if (element.buffer !== undefined) {
    const mime = element.mimeType ?? 'image/png'
    opts['data'] = `data:${mime};base64,${element.buffer.toString('base64')}`
  }

  slide.addImage(opts)
}

/**
 * Render a shape element (rect, ellipse, line, etc.) onto a slide with optional fill and border.
 * @param slide
 * @param element
 */
function addShape(slide: PptxSlide, element: ShapeElement): void {
  const shapeType = mapShape(element.shape)
  const opts: Record<string, unknown> = {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
  }
  if (element.fill) opts['fill'] = { color: stripHash(element.fill) }
  if (element.line) {
    opts['line'] = {
      color: stripHash(element.line),
      width: element.lineWidth ?? 1,
    }
  } else if (element.lineWidth !== undefined) {
    // lineWidth without a color — fall back to black.
    opts['line'] = { color: '000000', width: element.lineWidth }
  }
  if (element.shape === 'roundedRect' && element.rectRadius !== undefined) {
    opts['rectRadius'] = element.rectRadius
  }
  slide.addShape(shapeType, opts)
}

/**
 * Render a chart element (bar, line, pie) onto a slide using pptxgenjs series data.
 * @param slide
 * @param element
 */
function addChart(slide: PptxSlide, element: ChartElement): void {
  const chartType = mapChart(element.chart)
  // pptxgenjs expects: [{ name, labels, values }]
  const data = element.series.map((s) => ({
    name: s.name,
    labels: s.data.map((d) => d.label),
    values: s.data.map((d) => d.value),
  }))

  const opts: Record<string, unknown> = {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    showLegend: element.showLegend !== undefined ? element.showLegend : element.series.length > 1,
  }
  if (element.title) {
    opts['showTitle'] = true
    opts['title'] = element.title
  }

  slide.addChart(chartType, data, opts)
}

/**
 * Map a molecule shape kind string to the corresponding pptxgenjs shape name.
 * @param kind
 */
function mapShape(kind: ShapeElement['shape']): string {
  switch (kind) {
    case 'rect':
      return 'rect'
    case 'roundedRect':
      return 'roundRect'
    case 'ellipse':
      return 'ellipse'
    case 'line':
      return 'line'
  }
}

/**
 * Map a molecule chart kind string to the corresponding pptxgenjs chart type name.
 * @param kind
 */
function mapChart(kind: ChartElement['chart']): string {
  switch (kind) {
    case 'bar':
      return 'bar'
    case 'line':
      return 'line'
    case 'pie':
      return 'pie'
  }
}

/**
 * Convert a molecule {@link TextStyle} to a flat pptxgenjs text-options object.
 * @param style
 */
function textStyleToPptx(style: TextStyle): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (style.fontFace) out['fontFace'] = style.fontFace
  if (style.fontSize !== undefined) out['fontSize'] = style.fontSize
  if (style.color) out['color'] = stripHash(style.color)
  if (style.bold !== undefined) out['bold'] = style.bold
  if (style.italic !== undefined) out['italic'] = style.italic
  if (style.underline !== undefined) {
    out['underline'] = style.underline ? { style: 'sng' } : { style: 'none' }
  }
  if (style.align) out['align'] = style.align
  if (style.valign) out['valign'] = style.valign
  return out
}

/**
 * Strip a leading `#` from a CSS hex color string so pptxgenjs receives bare hex.
 * @param color
 */
function stripHash(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color
}

/**
 * Normalize an image `data` field to a `data:` URI form. Accepts either
 * a bare `image/png;base64,...` (pptxgenjs's documented shape) or a full
 * `data:image/png;base64,...` (more common in the wild).
 * @param value
 */
function normalizeImageDataUri(value: string): string {
  if (value.startsWith('data:')) return value
  return `data:${value}`
}

/**
 * Sanitize a string for use as a filename (no path separators, no control
 * characters). Always returns a non-empty string ending in `.pptx`.
 * @param name
 */
function sanitizeFilename(name: string): string {
  // Strip control chars (NUL–US, DEL) plus the standard set of filename-
  // illegal punctuation; collapse runs of whitespace.
  let cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[ -<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) cleaned = 'deck'
  if (!/\.pptx$/i.test(cleaned)) cleaned += '.pptx'
  return cleaned
}

/**
 * Coerce the raw output of `pptxgenjs.write()` to a Node `Buffer`, handling all known return shapes.
 * @param value
 */
function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) return Buffer.from(value)
  if (typeof value === 'string') return Buffer.from(value, 'binary')
  if (
    value &&
    typeof value === 'object' &&
    'arrayBuffer' in value &&
    typeof (value as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer === 'function'
  ) {
    // Blob — but we asked for nodebuffer, so this branch is defensive.
    throw new TypeError('exportPptx: pptxgenjs returned a Blob; expected Buffer/Uint8Array/string')
  }
  throw new TypeError(`exportPptx: unexpected pptxgenjs output of type ${typeof value}`)
}

export { PPTX_CONTENT_TYPE, sanitizeFilename }
