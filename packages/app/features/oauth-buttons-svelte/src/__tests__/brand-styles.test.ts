/**
 * Port of `@molecule/app-oauth-buttons-react`'s brand-styles tests: the same
 * assertions, with `getBrandStyle` returning the Svelte inline-style format
 * (a CSS declaration string for `style={…}`).
 */
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
    expect(style).toContain('background: #24292f')
    expect(style).toContain('color: #ffffff')
  })

  it('adds borderColor + borderWidth only for light-bg providers', () => {
    const google = getBrandStyle('google')
    expect(google).toContain('border-color: #dadce0')
    expect(google).toContain('border-width: 1px')

    const github = getBrandStyle('github')
    expect(github).not.toContain('border-color')
  })

  it('returns an empty style for unknown providers (ClassMap takes over)', () => {
    expect(getBrandStyle('keycloak')).toBe('')
  })
})
