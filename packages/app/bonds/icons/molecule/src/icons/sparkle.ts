import type { IconData } from '@molecule/app-icons'

/**
 * A four-point sparkle (✦) — the "smart tip / suggestion" glyph used for the
 * proactive relevant-skill hint and the onboarding tip card. Reads as a tip far
 * better than the generic lightbulb it replaces (P3-01). Each of the four edges is
 * a quadratic curve that bows toward the centre, forming the concave points.
 */
export const sparkle: IconData = {
  paths: [
    {
      d: 'M8 .75 Q8 8 15.25 8 Q8 8 8 15.25 Q8 8 .75 8 Q8 8 8 .75 Z',
    },
  ],
  viewBox: '0 0 16 16',
}
