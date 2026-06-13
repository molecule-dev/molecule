import type { IconData } from '@molecule/app-icons'

/**
 * Tablet device (landscape slab with a home indicator) — used by the IDE
 * preview device-frame cycle. Octicons has no tablet glyph, so this is drawn
 * in the same 16px filled style: an outer rounded body, an inset screen cut
 * out via the `evenodd` rule, and a home dot inside the screen.
 */
export const deviceTablet: IconData = {
  paths: [
    {
      d: 'M2.75 2.5 H13.25 A1.75 1.75 0 0 1 15 4.25 V11.75 A1.75 1.75 0 0 1 13.25 13.5 H2.75 A1.75 1.75 0 0 1 1 11.75 V4.25 A1.75 1.75 0 0 1 2.75 2.5 Z M3.1 4 H12.9 A0.6 0.6 0 0 1 13.5 4.6 V10.4 A0.6 0.6 0 0 1 12.9 11 H3.1 A0.6 0.6 0 0 1 2.5 10.4 V4.6 A0.6 0.6 0 0 1 3.1 4 Z M7.3 9.9 a0.7 0.7 0 1 0 1.4 0 a0.7 0.7 0 1 0 -1.4 0 Z',
      fillRule: 'evenodd',
    },
  ],
  viewBox: '0 0 16 16',
}
