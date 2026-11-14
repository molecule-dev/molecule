import { describe, expect, it } from 'vitest'

import { getButtonLayoutStyle, getLayoutStyle } from '../layout.js'

describe('getLayoutStyle', () => {
  it('returns no overrides for the horizontal default', () => {
    expect(getLayoutStyle('horizontal', 3)).toEqual({})
  })

  it('switches flex-direction to column for vertical', () => {
    expect(getLayoutStyle('vertical', 4)).toEqual({
      flexDirection: 'column',
      flexWrap: 'nowrap',
    })
  })

  it('renders an N-column grid up to 4 columns when count <= 4', () => {
    expect(getLayoutStyle('grid', 1)).toMatchObject({
      display: 'grid',
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    })
    expect(getLayoutStyle('grid', 4)).toMatchObject({
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    })
  })

  it('caps at 2 columns for >4 providers (small grid)', () => {
    expect(getLayoutStyle('grid', 5)).toMatchObject({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    })
    expect(getLayoutStyle('grid', 8)).toMatchObject({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    })
  })
})

describe('getButtonLayoutStyle', () => {
  it('stretches each button to 100% in vertical mode', () => {
    expect(getButtonLayoutStyle('vertical')).toEqual({ width: '100%' })
  })

  it('returns no overrides for horizontal or grid', () => {
    expect(getButtonLayoutStyle('horizontal')).toEqual({})
    expect(getButtonLayoutStyle('grid')).toEqual({})
  })
})
