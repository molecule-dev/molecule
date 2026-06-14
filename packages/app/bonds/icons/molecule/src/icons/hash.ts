import type { IconData } from '@molecule/app-icons'

/**
 * Hash/number-sign glyph (a hand-built `#` — four bars in the 16px box). The
 * themed channel icon for chat-channel activity in `@molecule/app-ide-react`'s
 * Activity card + panel — the SVG counterpart to the old literal `#` text glyph.
 * Filled with `currentColor` so it follows the surrounding theme token like the
 * rest of the set.
 */
export const hash: IconData = {
  paths: [
    {
      d: 'M5 1.5H6.5V14.5H5Z M9.5 1.5H11V14.5H9.5Z M2 4.5H14V6H2Z M2 10H14V11.5H2Z',
    },
  ],
  viewBox: '0 0 16 16',
}
