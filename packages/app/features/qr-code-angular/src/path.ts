/**
 * Build the SVG path that draws a QR matrix's dark modules.
 *
 * @module
 */

/**
 * Build the contiguous-run path data for the dark modules in a QR matrix. We
 * collapse horizontal runs of dark modules into a single `M h Z` instruction
 * per run, which is dramatically smaller than per-module rectangles while
 * still rendering pixel-perfect.
 *
 * @param qr - The fully-built QR code object.
 * @param margin - Quiet-zone margin in modules.
 * @returns SVG path `d` attribute string.
 */
export function buildQrPath(
  qr: { getModuleCount: () => number; isDark: (row: number, col: number) => boolean },
  margin: number,
): string {
  const moduleCount = qr.getModuleCount()
  const segments: string[] = []
  for (let row = 0; row < moduleCount; row++) {
    let col = 0
    while (col < moduleCount) {
      if (qr.isDark(row, col)) {
        const runStart = col
        while (col < moduleCount && qr.isDark(row, col)) col++
        const runLen = col - runStart
        segments.push(`M${runStart + margin} ${row + margin}h${runLen}v1h-${runLen}z`)
      } else {
        col++
      }
    }
  }
  return segments.join('')
}
