import type { IconData } from '@molecule/app-icons'

/**
 * Screen / device rotation (portrait ⇄ landscape) — used by the IDE preview
 * panel's "Rotate" control to swap a fixed-frame device (tablet / mobile)
 * between portrait and landscape.
 *
 * Octicons has no screen-rotation glyph, so this is the canonical Material
 * Design `screen_rotation` mark (a tilted device with the two curved
 * re-orientation arrows) — instantly recognizable as "rotate the screen" and
 * clearly distinct from the neighbouring two-arrow `sync`/refresh glyph. It is
 * drawn on Material's native 24×24 grid; the renderer scales it to the
 * requested pixel size like any other glyph.
 */
export const rotate: IconData = {
  paths: [
    {
      d: 'M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36zm-7.31 1.29C4.25 20.93 1.91 17.76 1.55 14H.05C.56 19.16 5.71 24 12 24l.66-.03-3.81-3.81-1.33 1.32z',
    },
  ],
  viewBox: '0 0 24 24',
}
