import type { QrMatrix } from './buildMatrix.js'

/**
 * Build the contiguous-run path data for the dark modules in a QR matrix. We
 * collapse horizontal runs of dark modules into a single `M h v h Z`
 * instruction per run, which is dramatically smaller than per-module
 * rectangles while still rendering pixel-perfect.
 *
 * @param matrix - Built QR matrix from {@link buildMatrix}.
 * @returns SVG path `d` attribute string.
 */
export function buildSvgPath(matrix: QrMatrix): string {
  const { moduleCount, margin, isDark } = matrix
  const segments: string[] = []
  for (let row = 0; row < moduleCount; row++) {
    let col = 0
    while (col < moduleCount) {
      if (isDark(row, col)) {
        const runStart = col
        while (col < moduleCount && isDark(row, col)) col++
        const runLen = col - runStart
        segments.push(`M${runStart + margin} ${row + margin}h${runLen}v1h-${runLen}z`)
      } else {
        col++
      }
    }
  }
  return segments.join('')
}

/**
 * Options for {@link renderSvg}.
 */
export interface RenderSvgOptions {
  /** Output width/height in pixels. */
  size: number
  /** Foreground (dark module) color. */
  fgColor: string
  /** Background color. */
  bgColor: string
}

/**
 * Render a QR matrix as a crisp, scalable SVG string. The SVG uses a
 * `viewBox` sized to the matrix + quiet zone, so the rendered pixel size
 * is purely a function of the `width`/`height` attributes.
 *
 * @param matrix - Built QR matrix from {@link buildMatrix}.
 * @param options - Output size + colors.
 * @returns SVG markup as a string.
 */
export function renderSvg(matrix: QrMatrix, options: RenderSvgOptions): string {
  const { size, fgColor, bgColor } = options
  const totalModules = matrix.moduleCount + matrix.margin * 2
  const path = buildSvgPath(matrix)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"` +
    ` viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges">` +
    `<rect x="0" y="0" width="${totalModules}" height="${totalModules}" fill="${escapeAttr(bgColor)}"/>` +
    `<path d="${path}" fill="${escapeAttr(fgColor)}"/>` +
    `</svg>`
  )
}

/**
 * Minimal XML attribute escaping for color strings (callers may pass
 * `rgba(...)` or named colors).
 *
 * @param value - Raw attribute value.
 * @returns Escaped attribute value safe for inclusion inside double quotes.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
