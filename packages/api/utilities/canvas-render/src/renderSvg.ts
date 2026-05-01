/**
 * Pure-string SVG serializer. Each {@link Layer} maps onto an SVG element;
 * {@link Transform} fields turn into a `transform="..."` attribute.
 *
 * No external dependencies — SVG is a text format, so we never need a native
 * binding to produce it.
 *
 * @module
 */

import type {
  CanvasDocument,
  EllipseLayer,
  ImageLayer,
  Layer,
  LineLayer,
  PathLayer,
  RectLayer,
  RenderOptions,
  TextLayer,
  Transform,
} from './types.js'

/**
 * Render a {@link CanvasDocument} as an SVG `Buffer` (UTF-8).
 *
 * @param doc - Document to render.
 * @param options - Output sizing options. `dpi` is ignored (SVG is vector).
 * @returns A Buffer containing the SVG XML body.
 */
export function renderSvg(doc: CanvasDocument, options: RenderOptions): Buffer {
  const targetWidth = options.width ?? doc.width
  const targetHeight = options.height ?? doc.height

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(targetWidth)}" height="${num(
      targetHeight,
    )}" viewBox="0 0 ${num(doc.width)} ${num(doc.height)}">`,
  )
  if (doc.background) {
    parts.push(
      `<rect x="0" y="0" width="${num(doc.width)}" height="${num(doc.height)}" fill="${escapeAttr(
        doc.background,
      )}"/>`,
    )
  }
  for (const layer of doc.layers) {
    parts.push(layerToSvg(layer))
  }
  parts.push('</svg>')

  return Buffer.from(parts.join(''), 'utf8')
}

/**
 * @param layer
 */
function layerToSvg(layer: Layer): string {
  switch (layer.kind) {
    case 'rect':
      return rectSvg(layer)
    case 'ellipse':
      return ellipseSvg(layer)
    case 'line':
      return lineSvg(layer)
    case 'path':
      return pathSvg(layer)
    case 'text':
      return textSvg(layer)
    case 'image':
      return imageSvg(layer)
    case 'group':
      return groupSvg(layer)
    default: {
      const _exhaustive: never = layer
      throw new Error(`Unknown layer kind: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/**
 * @param layer
 */
function rectSvg(layer: RectLayer): string {
  const radius =
    layer.radius && layer.radius > 0 ? ` rx="${num(layer.radius)}" ry="${num(layer.radius)}"` : ''
  return `<rect x="${num(layer.x)}" y="${num(layer.y)}" width="${num(layer.width)}" height="${num(
    layer.height,
  )}"${radius}${shapeAttrs(layer)}${transformAttr(layer)}/>`
}

/**
 * @param layer
 */
function ellipseSvg(layer: EllipseLayer): string {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  return `<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(layer.width / 2)}" ry="${num(
    layer.height / 2,
  )}"${shapeAttrs(layer)}${transformAttr(layer)}/>`
}

/**
 * @param layer
 */
function lineSvg(layer: LineLayer): string {
  // Lines use stroke only — fill is meaningless for a line segment.
  return `<line x1="${num(layer.x1)}" y1="${num(layer.y1)}" x2="${num(layer.x2)}" y2="${num(
    layer.y2,
  )}"${shapeAttrs({ ...layer, fill: undefined })}${transformAttr(layer)}/>`
}

/**
 * @param layer
 */
function pathSvg(layer: PathLayer): string {
  return `<path d="${escapeAttr(layer.d)}"${shapeAttrs(layer)}${transformAttr(layer)}/>`
}

/**
 * @param layer
 */
function textSvg(layer: TextLayer): string {
  const family = layer.fontFamily ?? 'sans-serif'
  const size = layer.fontSize ?? 16
  const weight = layer.fontWeight ?? 'normal'
  const style = layer.italic ? ' font-style="italic"' : ''
  const fill = ` fill="${escapeAttr(layer.fill ?? '#000000')}"`
  const stroke = layer.stroke
    ? ` stroke="${escapeAttr(layer.stroke)}" stroke-width="${num(layer.strokeWidth ?? 1)}"`
    : ''
  const align = mapTextAnchor(layer.align)
  const baseline = mapDominantBaseline(layer.baseline)
  return `<text x="${num(layer.x)}" y="${num(
    layer.y,
  )}" font-family="${escapeAttr(family)}" font-size="${num(
    size,
  )}" font-weight="${escapeAttr(String(weight))}"${style}${fill}${stroke} text-anchor="${align}" dominant-baseline="${baseline}"${transformAttr(layer)}>${escapeText(layer.text)}</text>`
}

/**
 * @param layer
 */
function imageSvg(layer: ImageLayer): string {
  const sources = [layer.src, layer.data, layer.buffer].filter((v) => v !== undefined)
  if (sources.length === 0) {
    throw new Error('image layer requires one of: src, data, buffer')
  }
  if (sources.length > 1) {
    throw new Error('image layer accepts only one of: src, data, buffer')
  }
  let href: string
  if (layer.src !== undefined) {
    href = layer.src
  } else if (layer.data !== undefined) {
    href = layer.data.startsWith('data:') ? layer.data : `data:${layer.data}`
  } else {
    const mime = layer.mimeType ?? 'image/png'
    href = `data:${mime};base64,${(layer.buffer as Buffer).toString('base64')}`
  }
  return `<image x="${num(layer.x)}" y="${num(layer.y)}" width="${num(layer.width)}" height="${num(
    layer.height,
  )}" href="${escapeAttr(href)}"${transformAttr(layer)}/>`
}

/**
 * @param layer
 */
function groupSvg(layer: { children: Layer[] } & Transform): string {
  const inner = layer.children.map(layerToSvg).join('')
  return `<g${transformAttr(layer)}>${inner}</g>`
}

/**
 * @param layer
 */
function shapeAttrs(layer: { fill?: string; stroke?: string; strokeWidth?: number }): string {
  let out = ''
  if (layer.fill) {
    out += ` fill="${escapeAttr(layer.fill)}"`
  } else {
    out += ' fill="none"'
  }
  if (layer.stroke) {
    out += ` stroke="${escapeAttr(layer.stroke)}" stroke-width="${num(layer.strokeWidth ?? 1)}"`
  }
  return out
}

/**
 * @param t
 */
function transformAttr(t: Transform): string {
  const parts: string[] = []
  if (t.x || t.y) parts.push(`translate(${num(t.x ?? 0)},${num(t.y ?? 0)})`)
  if (t.rotation) parts.push(`rotate(${num(t.rotation)})`)
  if (t.scaleX !== undefined || t.scaleY !== undefined) {
    parts.push(`scale(${num(t.scaleX ?? 1)},${num(t.scaleY ?? 1)})`)
  }
  let attr = ''
  if (parts.length > 0) attr += ` transform="${parts.join(' ')}"`
  if (t.opacity !== undefined && t.opacity !== 1) {
    attr += ` opacity="${num(t.opacity)}"`
  }
  return attr
}

/**
 * @param align
 */
function mapTextAnchor(align: TextLayer['align']): string {
  switch (align) {
    case 'center':
      return 'middle'
    case 'right':
      return 'end'
    default:
      return 'start'
  }
}

/**
 * @param baseline
 */
function mapDominantBaseline(baseline: TextLayer['baseline']): string {
  switch (baseline) {
    case 'top':
      return 'hanging'
    case 'middle':
      return 'middle'
    case 'bottom':
      return 'text-after-edge'
    default:
      return 'alphabetic'
  }
}

/**
 * @param value
 */
function num(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

/**
 * @param value
 */
function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/**
 * @param value
 */
function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
