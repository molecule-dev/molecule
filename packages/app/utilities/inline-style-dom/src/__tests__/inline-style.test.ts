import { describe, expect, it } from 'vitest'

import { bindInlineStyle, toStyleProps } from '../index.js'

describe('toStyleProps', () => {
  it('normalizes CSS keys and values for renderer style bindings', () => {
    expect(
      toStyleProps({
        marginTop: 2,
        height: 0,
        msTransform: 'translateX(4px)',
        WebkitLineClamp: 2,
        '--caseSensitive': 7,
        color: ' red !important ',
        display: false,
        position: '',
      }),
    ).toEqual({
      'margin-top': '2px',
      height: '0',
      '-ms-transform': 'translateX(4px)',
      '-webkit-line-clamp': '2',
      '--caseSensitive': '7',
      color: 'red !important',
    })
    expect(toStyleProps(undefined)).toBeUndefined()
  })
})

describe('bindInlineStyle', () => {
  it('updates and clears only its own declarations, including custom properties', () => {
    const node = document.createElement('div')
    node.style.width = '40px'
    node.style.height = '20px'
    const binding = bindInlineStyle(node, {
      marginTop: 2,
      color: 'red',
      '--caseSensitive': 3,
      width: null,
      height: 'invalid-length',
    })

    expect(node.style.marginTop).toBe('2px')
    expect(node.style.color).toBe('red')
    expect(node.style.getPropertyValue('--caseSensitive')).toBe('3')
    expect(node.style.width).toBe('40px')

    binding.update({ marginTop: 8, color: false, backgroundColor: 'lime' })
    expect(node.style.marginTop).toBe('8px')
    expect(node.style.color).toBe('')
    expect(node.style.backgroundColor).toBe('lime')
    expect(node.style.getPropertyValue('--caseSensitive')).toBe('')
    expect(node.style.height).toBe('20px')

    node.style.backgroundColor = 'blue'
    binding.destroy()
    expect(node.style.marginTop).toBe('')
    expect(node.style.backgroundColor).toBe('blue')
    expect(node.style.width).toBe('40px')
    expect(node.style.height).toBe('20px')
  })

  it('preserves an external change while its own requested value stays the same', () => {
    const node = document.createElement('div')
    const binding = bindInlineStyle(node, { backgroundColor: 'lime', marginTop: 2 })
    node.style.backgroundColor = 'blue'

    binding.update({ backgroundColor: 'lime', marginTop: 8 })
    expect(node.style.backgroundColor).toBe('blue')
    expect(node.style.marginTop).toBe('8px')

    binding.update({ backgroundColor: 'red', marginTop: 8 })
    expect(node.style.backgroundColor).toBe('red')
    binding.destroy()
    expect(node.style.backgroundColor).toBe('')
  })

  it('sets priorities and resets them when values change', () => {
    const node = document.createElement('div')
    const binding = bindInlineStyle(node, {
      color: ' red !important ',
      '--caseSensitive': 'blue !important',
    })
    expect(node.style.color).toBe('red')
    expect(node.style.getPropertyPriority('color')).toBe('important')
    expect(node.style.getPropertyValue('--caseSensitive')).toBe('blue')
    binding.update({ color: 'lime' })
    expect(node.style.color).toBe('lime')
    expect(node.style.getPropertyPriority('color')).toBe('')
    expect(node.style.getPropertyValue('--caseSensitive')).toBe('')
  })

  it('reapplies surviving longhands after removing an overlapping shorthand', () => {
    const node = document.createElement('div')
    const binding = bindInlineStyle(node, { margin: 9, marginTop: 3 })
    expect(node.style.marginLeft).toBe('9px')
    expect(node.style.marginTop).toBe('3px')
    binding.update({ marginTop: 3 })
    expect(node.style.marginLeft).toBe('')
    expect(node.style.marginTop).toBe('3px')
  })
})
