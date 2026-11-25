import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { reactStyleText } from '../style.js'

const inherited = { __proto__: { width: 40 }, marginTop: 2 }

describe('reactStyleText matches React DOM server', () => {
  it.each([
    [
      'positive, negative and fractional lengths',
      { marginTop: 3, left: -0.25, letterSpacing: 0.5 },
    ],
    ['numeric zero', { width: 0, marginTop: -0, opacity: 0, strokeWidth: 0 }],
    [
      'unitless layout and SVG properties',
      {
        aspectRatio: 1.5,
        flexGrow: 2,
        gridRowSpan: 3,
        gridColumnSpan: 2,
        fontWeight: 500,
        scale: 0.5,
        strokeMiterlimit: 4,
        fillOpacity: 0.25,
      },
    ],
    [
      'vendor prefixes',
      {
        WebkitLineClamp: 2,
        WebkitMaskSize: 10,
        MozLineClamp: 3,
        msTransform: 'translateX(4px)',
        msGridRowSpan: 2,
      },
    ],
    ['case-sensitive custom properties', { '--accentRGB': ' 5, 10, 15 ', '--sectionIndex': 3 }],
    [
      'null, undefined, boolean and empty values',
      {
        width: null,
        height: undefined,
        display: false,
        visibility: true,
        color: '',
        marginTop: 2,
      },
    ],
    ['whitespace-only declarations', { color: '  ', '--blankValue': '  ' }],
    ['importance and trimmed strings', { color: ' blue !important ', margin: ' 2px 4px ' }],
    ['HTML-sensitive characters in a CSS value', { '--message': '"A & B < C > D" \'s' }],
    [
      'shorthand and longhand order',
      { gap: 9, columnGap: 3, borderTop: '1px solid red', borderColor: 'blue' },
    ],
    ['own properties only', inherited],
    ['no declarations', { width: null, display: false, color: '' }],
    ['an empty object', {}],
  ] satisfies [string, object][])('serializes %s byte for byte', (_label, style) => {
    const markup = renderToStaticMarkup(createElement('div', { style }))
    const template = document.createElement('template')
    template.innerHTML = markup
    const expected = template.content.firstElementChild?.getAttribute('style') ?? undefined

    expect(reactStyleText(style)).toBe(expected)
  })

  it('omits an absent style attribute', () => {
    expect(renderToStaticMarkup(createElement('div'))).toBe('<div></div>')
    expect(reactStyleText(undefined)).toBeUndefined()
  })
})
