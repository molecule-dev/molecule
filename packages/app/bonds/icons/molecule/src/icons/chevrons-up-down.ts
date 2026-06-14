import type { IconData } from '@molecule/app-icons'

/**
 * SVG path data for the chevrons up-down icon — the universal neutral "this
 * column is sortable but not currently sorted" glyph. Composed from the same
 * `chevron-up` and `chevron-down` shapes (translated into the top and bottom
 * halves) so it reads as one consistent family with the active asc/desc
 * indicators.
 */
export const chevronsUpDown: IconData = {
  paths: [],
  viewBox: '0 0 16 16',
  svg: `<g transform="translate(0 -3)"><path fill="currentColor" d="M3.22 10.53a.749.749 0 0 1 0-1.06l4.25-4.25a.749.749 0 0 1 1.06 0l4.25 4.25a.749.749 0 1 1-1.06 1.06L8 6.811 4.28 10.53a.749.749 0 0 1-1.06 0Z"/></g><g transform="translate(0 3)"><path fill="currentColor" d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"/></g>`,
}
