/**
 * Port of `@molecule/app-oauth-buttons-react`'s layout tests: the same
 * assertions, with the style payloads in the Svelte inline-style format
 * (CSS declaration strings for `style={…}`).
 */
import { describe, expect, it } from 'vitest'

import { getButtonLayoutStyle, getLayoutStyle } from '../layout.js'

describe('getLayoutStyle', () => {
  it('returns no overrides for the horizontal default', () => {
    expect(getLayoutStyle('horizontal', 3)).toBe('')
  })

  it('switches flex-direction to column for vertical', () => {
    expect(getLayoutStyle('vertical', 4)).toBe('flex-direction: column; flex-wrap: nowrap')
  })

  it('renders an N-column grid up to 4 columns when count <= 4', () => {
    expect(getLayoutStyle('grid', 1)).toContain('display: grid')
    expect(getLayoutStyle('grid', 1)).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))')
    expect(getLayoutStyle('grid', 4)).toContain('display: grid')
    expect(getLayoutStyle('grid', 4)).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
  })

  it('caps at 2 columns for >4 providers (small grid)', () => {
    expect(getLayoutStyle('grid', 5)).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(getLayoutStyle('grid', 8)).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
  })
})

describe('getButtonLayoutStyle', () => {
  it('stretches each button to 100% in vertical mode', () => {
    expect(getButtonLayoutStyle('vertical')).toBe('width: 100%')
  })

  it('returns no overrides for horizontal or grid', () => {
    expect(getButtonLayoutStyle('horizontal')).toBe('')
    expect(getButtonLayoutStyle('grid')).toBe('')
  })
})
