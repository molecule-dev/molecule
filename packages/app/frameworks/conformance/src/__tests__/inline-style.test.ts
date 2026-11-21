// @vitest-environment jsdom

/**
 * `inlineStyleMismatch` compares what the CSSOM applies, so the same declarations match however
 * the engine writes them. Each markup below comes from the engine itself (an element styled
 * through the CSSOM, then `outerHTML`), so the cases hold under any jsdom and in a browser.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { inlineStyleMismatch } from '../ui/inline-style.js'

/** The markup the engine writes for an element styled through the CSSOM. */
const styled = (set: (style: CSSStyleDeclaration) => void): string => {
  const el = document.createElement('div')
  set(el.style)
  return `<section>${el.outerHTML}</section>`
}

describe('inlineStyleMismatch', () => {
  it('matches grid-column and grid-row however the engine serializes them', () => {
    // jsdom 31 and browsers write these two as `grid-area: span 2 / span 6`.
    const markup = styled((s) => {
      s.gridColumn = 'span 6'
      s.gridRow = 'span 2'
    })
    expect(inlineStyleMismatch(markup, { gridColumn: 'span 6', gridRow: 'span 2' })).toBeNull()
  })

  it('matches currentColor written by the CSSOM or as attribute text', () => {
    const viaCssom = styled((s) => {
      s.outline = '2px solid currentColor'
    })
    expect(inlineStyleMismatch(viaCssom, { outline: '2px solid currentColor' })).toBeNull()
    const asText = '<div style="outline: 2px solid currentColor; outline-offset: -2px"></div>'
    expect(
      inlineStyleMismatch(asText, { outline: '2px solid currentColor', outlineOffset: '-2px' }),
    ).toBeNull()
  })

  it('reports a value the engine applies differently, naming what it found', () => {
    const markup = styled((s) => {
      s.gridColumn = 'span 6'
    })
    const message = inlineStyleMismatch(markup, { gridColumn: 'span 5' })
    expect(message).toMatch(/grid-column: span 5/)
    expect(message).toMatch(/inline styles: <div style=/)
  })

  it('requires every declaration on ONE element', () => {
    const markup = '<div style="grid-column: span 6"></div><div style="grid-row: span 2"></div>'
    expect(inlineStyleMismatch(markup, { gridColumn: 'span 6', gridRow: 'span 2' })).not.toBeNull()
  })

  it('limits the candidates to the selector', () => {
    const markup = '<p style="color: red"></p><span style="color: blue"></span>'
    expect(inlineStyleMismatch(markup, { color: 'red' }, 'span')).not.toBeNull()
    expect(inlineStyleMismatch(markup, { color: 'blue' }, 'span')).toBeNull()
  })

  it('throws on an expected value the CSSOM rejects, rather than never matching', () => {
    expect(() => inlineStyleMismatch('<div></div>', { width: '12 px' })).toThrow(/rejects width/)
  })
})
