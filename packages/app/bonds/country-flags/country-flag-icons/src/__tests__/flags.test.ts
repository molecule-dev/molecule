/**
 * Tests for the country-flag-icons flag set.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { countryFlags } from '../flags.js'

describe('countryFlags', () => {
  it('provides US, CN, and EU flags as complete SVG markup', () => {
    for (const code of ['US', 'CN', 'EU']) {
      const flag = countryFlags[code]
      expect(flag, code).toBeDefined()
      expect(flag.svg, code).toMatch(/^<svg[\s>]/)
      expect(flag.svg, code).toContain('</svg>')
      expect(flag.svg, code).toContain('viewBox')
    }
  })

  it('uses the 3:2 aspect ratio throughout', () => {
    for (const flag of Object.values(countryFlags)) {
      expect(flag.aspectRatio).toBe(1.5)
    }
  })

  it('keys every flag by an UPPERCASE code', () => {
    for (const code of Object.keys(countryFlags)) {
      expect(code).toBe(code.toUpperCase())
    }
  })
})
