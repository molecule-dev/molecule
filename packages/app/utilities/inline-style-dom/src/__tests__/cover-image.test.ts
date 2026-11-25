import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { bindInlineStyle, coverImageStyle, reactStyleText, toStyleProps } from '../index.js'

/**
 * The style attribute React DOM writes for a style object.
 *
 * @param style - The style object.
 * @returns The attribute value.
 */
function reactDomStyle(style: Record<string, string | number | undefined>): string | undefined {
  return /style="([^"]*)"/
    .exec(renderToStaticMarkup(createElement('div', { style })))?.[1]
    ?.replaceAll('&quot;', '"')
}

describe('an element style coverImage', () => {
  it('serializes as the background declarations the React kit writes, in its place', () => {
    const url = 'photos/a "quoted"\nname.png'

    expect(reactStyleText({ color: 'red', coverImage: url, opacity: 0.5 })).toBe(
      reactDomStyle({ color: 'red', ...coverImageStyle(url), opacity: 0.5 }),
    )
    expect(reactStyleText({ color: 'red', coverImage: url, opacity: 0.5 })).toBe(
      'color:red;background-image:url("photos/a \\22 quoted\\22 \\a name.png");' +
        'background-size:cover;background-position:center;opacity:0.5',
    )
  })

  it('paints no image for an empty URI, keeping the size and position', () => {
    expect(reactStyleText({ coverImage: '' }, ' ')).toBe(
      'background-size: cover; background-position: center',
    )
  })

  it('reaches renderer style maps and the CSSOM binding', () => {
    expect(toStyleProps({ coverImage: 'a.png', marginTop: 2 })).toEqual({
      'background-image': 'url("a.png")',
      'background-size': 'cover',
      'background-position': 'center',
      'margin-top': '2px',
    })
    const node = document.createElement('div')
    const binding = bindInlineStyle(node, { coverImage: 'a.png' })
    expect(node.style.backgroundImage).toBe('url("a.png")')
    expect(node.style.backgroundSize).toBe('cover')
    binding.update({ coverImage: undefined })
    expect(node.style.backgroundImage).toBe('')
    binding.destroy()
    expect(node.style.backgroundSize).toBe('')
  })

  it('leaves a style without one as React DOM writes it', () => {
    const style = { backgroundImage: 'url("b.png")', backgroundSize: 'contain', width: 4 }

    expect(reactStyleText(style)).toBe(reactDomStyle(style))
  })
})
