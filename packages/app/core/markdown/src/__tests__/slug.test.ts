import { describe, expect, it } from 'vitest'

import { createHeadingSlugger } from '../slug.js'

describe('createHeadingSlugger', () => {
  it('lowercases and hyphenates words', () => {
    const slug = createHeadingSlugger()
    expect(slug('  Hello, World!  ')).toBe('hello-world')
  })

  it('turns underscores and whitespace into one hyphen and collapses repeats', () => {
    const slug = createHeadingSlugger()
    expect(slug('snake_case - and more')).toBe('snake-case-and-more')
  })

  it('keeps Unicode letters and digits', () => {
    const slug = createHeadingSlugger()
    expect(slug('日本語')).toBe('日本語')
    expect(slug('Ünïcode & symbols')).toBe('ünïcode-symbols')
    expect(slug('123 numbers')).toBe('123-numbers')
  })

  it('falls back to section when the heading has no letters or digits', () => {
    expect(createHeadingSlugger()('🎉')).toBe('section')
    expect(createHeadingSlugger()('!!!')).toBe('section')
    expect(createHeadingSlugger()('---')).toBe('section')
  })

  it('suffixes repeats in order', () => {
    const slug = createHeadingSlugger()
    expect([slug('a'), slug('a'), slug('a')]).toEqual(['a', 'a-2', 'a-3'])
  })

  it('never collides a suffixed slug with a later heading whose text slugs to it', () => {
    const slug = createHeadingSlugger()
    expect([slug('a'), slug('a'), slug('a-2')]).toEqual(['a', 'a-2', 'a-2-2'])
  })

  it('restarts at no suffix for a fresh document', () => {
    const first = createHeadingSlugger()
    expect(first('a')).toBe('a')
    expect(first('a')).toBe('a-2')

    const second = createHeadingSlugger()
    expect(second('a')).toBe('a')
  })

  it('keeps the combining marks that complete a letter', () => {
    const slug = createHeadingSlugger()
    expect(slug('नमस्ते दुनिया')).toBe('नमस्ते-दुनिया')
    expect(slug('Cafe\u0301 menu')).toBe('cafe\u0301-menu')
  })

  it('gives a custom base the same suffixes, and section for an empty one', () => {
    const slug = createHeadingSlugger((text) => text.replace(/[^a-z]/g, ''))
    expect(slug('ab')).toBe('ab')
    expect(slug('ab')).toBe('ab-2')
    expect(slug('123')).toBe('section')
    expect(slug('456')).toBe('section-2')
  })
})
