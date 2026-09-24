/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { getCountryFlag, setCountryFlags } from '@molecule/app-country-flags'

import { countryFlags } from '../index.js'

describe('README @example', () => {
  it('bonds the flag set and renders sized SVG with a text fallback', () => {
    setCountryFlags(countryFlags)

    const flagHtml = (code: string, height = 16): string => {
      const flag = getCountryFlag(code)
      if (!flag) return code.toUpperCase()
      const width = Math.round(height * flag.aspectRatio)
      return flag.svg.replace('<svg', `<svg width="${width}" height="${height}" role="img"`)
    }

    const us = flagHtml('us')
    expect(us.startsWith('<svg width="24" height="16" role="img"')).toBe(true)
    expect(us).toContain('</svg>')
    expect(flagHtml('fr')).toBe('FR')
  })
})
