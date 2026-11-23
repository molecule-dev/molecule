import { describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import { checkElementAttributes, escapeAttributeValue, MARKDOWN_ELEMENTS } from '../attributes.js'

describe('MARKDOWN_ELEMENTS', () => {
  it('lists the elements markdown produces', () => {
    expect(MARKDOWN_ELEMENTS).toContain('a')
    expect(MARKDOWN_ELEMENTS).toContain('img')
    expect(MARKDOWN_ELEMENTS).toContain('h6')
    expect(MARKDOWN_ELEMENTS).toContain('blockquote')
    expect(MARKDOWN_ELEMENTS).toContain('input')
    expect(MARKDOWN_ELEMENTS).toContain('footnotes')
    expect(MARKDOWN_ELEMENTS).not.toContain('div')
  })
})

describe('checkElementAttributes', () => {
  it('does nothing when the option is absent', () => {
    expect(() => checkElementAttributes(undefined)).not.toThrow()
  })

  it('accepts attributes on elements markdown produces', () => {
    expect(() =>
      checkElementAttributes({
        a: { class: 'link', 'data-track': 'click' },
        code: { title: 'example' },
      }),
    ).not.toThrow()
  })

  it('throws for an element markdown does not produce', () => {
    const withUnknownElement: Record<string, Record<string, string>> = { div: { class: 'x' } }
    let error: unknown = undefined
    try {
      checkElementAttributes(withUnknownElement)
    } catch (thrown) {
      error = thrown
    }
    expect(error).toBeInstanceOf(I18nError)
    if (!(error instanceof I18nError)) throw error
    expect(error.i18nKey).toBe('markdown.elementAttributes.unknownElement')
    expect(error.i18nValues).toEqual({ element: 'div' })
    expect(error.message).toBe('elementAttributes names <div>, which markdown does not produce')
  })

  describe('refuses attributes the renderer owns', () => {
    it('refuses href on a link', () => {
      expect(() => checkElementAttributes({ a: { href: '/elsewhere' } })).toThrow(I18nError)
    })

    it('refuses src on an image', () => {
      expect(() => checkElementAttributes({ img: { src: '/elsewhere.png' } })).toThrow(I18nError)
    })

    it('refuses id on any element', () => {
      expect(() => checkElementAttributes({ h1: { id: 'custom' } })).toThrow(I18nError)
    })

    it('refuses an event handler name in any case', () => {
      expect(() => checkElementAttributes({ a: { onclick: 'x()' } })).toThrow(I18nError)
      expect(() => checkElementAttributes({ a: { ONCLICK: 'x()' } })).toThrow(I18nError)
      expect(() => checkElementAttributes({ a: { onerror: 'x()' } })).toThrow(I18nError)
    })

    it('names the element and the attribute in the error', () => {
      let error: unknown = undefined
      try {
        checkElementAttributes({ a: { href: '/elsewhere' } })
      } catch (thrown) {
        error = thrown
      }
      expect(error).toBeInstanceOf(I18nError)
      if (!(error instanceof I18nError)) throw error
      expect(error.i18nKey).toBe('markdown.elementAttributes.refused')
      expect(error.i18nValues).toEqual({ element: 'a', name: 'href' })
      expect(error.message).toBe('elementAttributes cannot set "href" on <a>: the renderer owns it')
    })
  })

  describe('refuses names that are not attribute names', () => {
    it('refuses an empty name', () => {
      expect(() => checkElementAttributes({ a: { '': 'x' } })).toThrow(I18nError)
    })

    it('refuses whitespace, quotes, a closing angle bracket, a slash or an equals sign', () => {
      expect(() => checkElementAttributes({ a: { 'data x': 'x' } })).toThrow(I18nError)
      expect(() => checkElementAttributes({ a: { 'data"x': 'x' } })).toThrow(I18nError)
      expect(() => checkElementAttributes({ a: { "data'x": 'x' } })).toThrow(I18nError)
      expect(() => checkElementAttributes({ a: { 'data>x': 'x' } })).toThrow(I18nError)
      expect(() => checkElementAttributes({ a: { 'data/x': 'x' } })).toThrow(I18nError)
      expect(() => checkElementAttributes({ a: { 'data=x': 'x' } })).toThrow(I18nError)
    })

    it('names the element and the invalid name in the error', () => {
      let error: unknown = undefined
      try {
        checkElementAttributes({ a: { 'data x': 'x' } })
      } catch (thrown) {
        error = thrown
      }
      expect(error).toBeInstanceOf(I18nError)
      if (!(error instanceof I18nError)) throw error
      expect(error.i18nKey).toBe('markdown.elementAttributes.invalidName')
      expect(error.i18nValues).toEqual({ element: 'a', name: 'data x' })
      expect(error.message).toBe('"data x" is not an attribute name (on <a>)')
    })
  })
})

describe('escapeAttributeValue', () => {
  it('escapes ampersand, angle brackets, and both quote characters', () => {
    expect(escapeAttributeValue(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('escapes each character exactly once', () => {
    expect(escapeAttributeValue('&amp;')).toBe('&amp;amp;')
  })

  it('leaves ordinary text unchanged', () => {
    expect(escapeAttributeValue('plain text')).toBe('plain text')
  })
})
