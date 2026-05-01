/**
 * Top-level entry point for `@molecule/api-canvas-render`. Dispatches a
 * {@link CanvasDocument} + format choice to the right renderer (PNG / SVG /
 * PDF) and returns a {@link RenderResult}.
 *
 * @module
 */

import { renderPdf } from './renderPdf.js'
import { renderPng } from './renderPng.js'
import { renderSvg } from './renderSvg.js'
import type { CanvasDocument, RenderOptions, RenderResult } from './types.js'

const PNG_CONTENT_TYPE = 'image/png' as const
const SVG_CONTENT_TYPE = 'image/svg+xml' as const
const PDF_CONTENT_TYPE = 'application/pdf' as const

/**
 * Render a {@link CanvasDocument} into a {@link RenderResult}. The output
 * format is chosen by `options.format`.
 *
 * @param doc - The canvas document.
 * @param options - Format + sizing options.
 * @returns Buffer + content-type + extension.
 */
export async function renderCanvasDocument(
  doc: CanvasDocument,
  options: RenderOptions,
): Promise<RenderResult> {
  if (!doc || !Array.isArray(doc.layers)) {
    throw new TypeError('renderCanvasDocument: doc.layers must be an array')
  }
  if (typeof doc.width !== 'number' || typeof doc.height !== 'number') {
    throw new TypeError('renderCanvasDocument: doc.width and doc.height must be numbers')
  }

  switch (options.format) {
    case 'png': {
      const buffer = await renderPng(doc, options)
      return { buffer, contentType: PNG_CONTENT_TYPE, extension: 'png' }
    }
    case 'svg': {
      const buffer = renderSvg(doc, options)
      return { buffer, contentType: SVG_CONTENT_TYPE, extension: 'svg' }
    }
    case 'pdf': {
      const buffer = renderPdf(doc, options)
      return { buffer, contentType: PDF_CONTENT_TYPE, extension: 'pdf' }
    }
    default: {
      const _exhaustive: never = options.format
      throw new Error(`Unsupported format: ${String(_exhaustive)}`)
    }
  }
}

export { PDF_CONTENT_TYPE, PNG_CONTENT_TYPE, SVG_CONTENT_TYPE }
