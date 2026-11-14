import { describe, expect, it } from 'vitest'

import { BRAND_STYLES, getBrandStyle } from '../brand-styles.js'

describe('BRAND_STYLES', () => {
  it('uses Google brand-spec white with a 1px border', () => {
    expect(BRAND_STYLES.google.background).toBe('#ffffff')
    expect(BRAND_STYLES.google.borderColor).toBeDefined()
  })

  it('uses dark backgrounds for GitHub / Apple / X', () => {
    expect(BRAND_STYLES.github.background).toMatch(/^#[0-2]/)
    expect(BRAND_STYLES.apple.background).toBe('#000000')
    expect(BRAND_STYLES.x.background).toBe('#000000')
  })

  it('always pairs background with a contrasting foreground', () => {
    for (const entry of Object.values(BRAND_STYLES)) {
      expect(entry.color.length).toBeGreaterThan(0)
      expect(entry.background).not.toBe(entry.color)
    }
  })
})

describe('getBrandStyle', () => {
  it('returns inline style with background and color for known providers', () => {
    const style = getBrandStyle('github')
    expect(style.background).toBeDefined()
    expect(style.color).toBeDefined()
  })

  it('adds border-color + 1px border-width only for light-bg providers', () => {
    // Solid's style runtime applies kebab-case keys verbatim, so React's
    // unitless `borderWidth: 1` (React appends px) is written out as `1px`.
    const google = getBrandStyle('google')
    expect(google['border-color']).toBeDefined()
    expect(google['border-width']).toBe('1px')

    const github = getBrandStyle('github')
    expect(github['border-color']).toBeUndefined()
  })

  it('returns an empty object for unknown providers (ClassMap takes over)', () => {
    expect(getBrandStyle('keycloak')).toEqual({})
  })
})
