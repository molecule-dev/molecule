import type { IconData } from '@molecule/app-icons'

/**
 * Speech-bubble glyph (authentic GitHub Octicons 16px `comment`). The themed
 * channel icon for SMS/message activity in `@molecule/app-ide-react`'s Activity
 * card + panel — the SVG counterpart to the old `💬` emoji. Filled with
 * `currentColor` so it follows the surrounding theme token like the rest of the
 * set.
 */
export const chat: IconData = {
  paths: [
    {
      d: 'M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z',
    },
  ],
  viewBox: '0 0 16 16',
}
