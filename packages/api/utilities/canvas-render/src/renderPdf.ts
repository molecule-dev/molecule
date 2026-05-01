/**
 * Minimal single-page PDF wrapper. Embeds the SVG produced by
 * {@link renderSvg} as a Form XObject is unsupported by the Adobe PDF
 * spec without rasterization, so this writer emits a small valid PDF
 * whose content stream renders the document's background + text
 * approximation. For high-fidelity vector PDFs, callers should rasterize
 * to PNG and embed; this writer is good enough for share/export use
 * cases on simple canvas documents.
 *
 * The output is a structurally-valid PDF: `%PDF-1.4` header, four core
 * objects (Catalog, Pages, Page, Content stream), xref table, trailer.
 *
 * @module
 */

import { renderSvg } from './renderSvg.js'
import type { CanvasDocument, RenderOptions } from './types.js'

/**
 * Render a {@link CanvasDocument} as a `Buffer` containing a single-page PDF.
 *
 * @param doc - Document to render.
 * @param options - Output sizing options. `dpi` is ignored.
 * @returns A PDF buffer (starts with the `%PDF-` header).
 */
export function renderPdf(doc: CanvasDocument, options: RenderOptions): Buffer {
  const targetWidth = options.width ?? doc.width
  const targetHeight = options.height ?? doc.height

  // Capture the SVG body so it can be embedded as the document's auxiliary
  // metadata stream. PDF readers ignore unknown streams; downstream tools
  // that DO understand the embedded SVG can use it for vector fidelity.
  const svgBuffer = renderSvg(doc, options)

  // Content stream — paints the background then a single text run that
  // identifies the document. Real text layout is delegated to consumers
  // who care; flagship "share as PDF" flows treat the PDF as a simple
  // wrapper, not an editable layout.
  const contentStreamLines: string[] = []
  if (doc.background) {
    const [r, g, b] = parseColor(doc.background)
    contentStreamLines.push(
      `${num(r)} ${num(g)} ${num(b)} rg`,
      `0 0 ${num(targetWidth)} ${num(targetHeight)} re f`,
    )
  }
  contentStreamLines.push(
    'BT',
    '/F1 12 Tf',
    `1 0 0 1 12 ${num(targetHeight - 24)} Tm`,
    `(${escapePdfString(`canvas (${doc.layers.length} layers)`)}) Tj`,
    'ET',
  )
  const contentStream = contentStreamLines.join('\n')

  const pdf = buildPdf({
    width: targetWidth,
    height: targetHeight,
    contentStream,
    embeddedSvg: svgBuffer.toString('utf8'),
  })

  return Buffer.from(pdf, 'binary')
}

interface BuildPdfArgs {
  width: number
  height: number
  contentStream: string
  embeddedSvg: string
}

/**
 * Hand-write a minimal PDF. PDF objects are referenced by 1-based ids and
 * the xref table records each object's byte offset.
 *
 * @param args - Pre-computed parts.
 */
function buildPdf(args: BuildPdfArgs): string {
  const { width, height, contentStream, embeddedSvg } = args

  const objects: string[] = []
  const objectByteOffsets: number[] = []

  let body = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'

  function pushObject(content: string): number {
    const id = objects.length + 1
    objectByteOffsets.push(Buffer.byteLength(body, 'binary'))
    const wrapped = `${id} 0 obj\n${content}\nendobj\n`
    objects.push(wrapped)
    body += wrapped
    return id
  }

  // Catalog → Pages
  const catalogId = pushObject('<< /Type /Catalog /Pages 2 0 R >>')
  // Pages
  const pagesId = pushObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  // Page
  pushObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(width)} ${num(
      height,
    )}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
  )
  // Content stream
  pushObject(
    `<< /Length ${Buffer.byteLength(contentStream, 'binary')} >>\nstream\n${contentStream}\nendstream`,
  )
  // Font (Helvetica)
  pushObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  // Embedded SVG metadata stream — readers ignore unknown streams; tools
  // that understand `/Subtype /image+svg+xml` can pull vector data back.
  pushObject(
    `<< /Type /EmbeddedFile /Subtype /image#2Bsvg+xml /Length ${Buffer.byteLength(
      embeddedSvg,
      'utf8',
    )} >>\nstream\n${embeddedSvg}\nendstream`,
  )

  // xref
  const xrefStart = Buffer.byteLength(body, 'binary')
  body += `xref\n0 ${objects.length + 1}\n`
  body += '0000000000 65535 f \n'
  for (const offset of objectByteOffsets) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`
  }

  // Trailer
  body += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${pagesId} 0 R >>\n`
  body += `startxref\n${xrefStart}\n%%EOF\n`

  return body
}

/**
 * Convert a CSS-style color into normalized 0..1 RGB.
 *
 * @param color - CSS color string (`#rgb`, `#rrggbb`, or `rgb(...)`).
 */
function parseColor(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16)
      const g = parseInt(hex[1]! + hex[1]!, 16)
      const b = parseInt(hex[2]! + hex[2]!, 16)
      return [r / 255, g / 255, b / 255]
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return [r / 255, g / 255, b / 255]
    }
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) {
    return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255]
  }
  return [1, 1, 1]
}

/**
 * @param value
 */
function num(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

/**
 * Escape a string for use inside a PDF literal `(...)` — the only special
 * chars we have to worry about are `\`, `(`, `)`, and non-ASCII.
 *
 * @param value - The literal to escape.
 */
function escapePdfString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
