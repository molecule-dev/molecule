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

  it('adds borderColor + borderWidth only for light-bg providers', () => {
    const google = getBrandStyle('google')
    expect(google.borderColor).toBeDefined()
    expect(google.borderWidth).toBe(1)

    const github = getBrandStyle('github')
    expect(github.borderColor).toBeUndefined()
  })

  it('returns an empty object for unknown providers (ClassMap takes over)', () => {
    expect(getBrandStyle('keycloak')).toEqual({})
  })
})
