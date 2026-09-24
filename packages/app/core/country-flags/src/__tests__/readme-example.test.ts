/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the `country-flag-icons` bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { countryFlags } from '@molecule/app-country-flags-country-flag-icons'

import { getCountryFlag, setCountryFlags } from '../index.js'

describe('README @example', () => {
  it('renders a sized flag for a known code and a text fallback for an unknown one', () => {
    setCountryFlags(countryFlags)

    const flagHtml = (code: string, height = 16): string => {
      const flag = getCountryFlag(code)
      if (!flag) return code.toUpperCase()
      const width = Math.round(height * flag.aspectRatio)
      return flag.svg.replace('<svg', `<svg width="${width}" height="${height}" role="img"`)
    }

    const us = flagHtml('us')
    expect(us.startsWith('<svg width="24" height="16" role="img"')).toBe(true)
    expect(us).toContain('viewBox=')
    expect(us.endsWith('</svg>')).toBe(true)
    expect(flagHtml('fr')).toBe('FR')
  })
})
