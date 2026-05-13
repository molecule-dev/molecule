import { describe, expect, it } from 'vitest'

import { editDistance, normalizeText } from '../normalize.js'

describe('normalizeText', () => {
  it('returns the input unchanged when no flags trigger transformations', () => {
    expect(
      normalizeText('Hello', {
        caseInsensitive: false,
        trim: false,
        collapseWhitespace: false,
        accentFold: false,
      }),
    ).toBe('Hello')
  })

  it('default flags collapse whitespace + trim + lowercase + accent-fold', () => {
    expect(normalizeText('  Café   Bleu  ')).toBe('cafe bleu')
  })

  it('trim only removes leading/trailing, not internal whitespace', () => {
    expect(
      normalizeText('  hello  world  ', {
        caseInsensitive: false,
        trim: true,
        collapseWhitespace: false,
        accentFold: false,
      }),
    ).toBe('hello  world')
  })

  it('collapseWhitespace squashes runs of any whitespace (incl. tabs / newlines)', () => {
    expect(
      normalizeText('a\tb  c\nd', {
        caseInsensitive: false,
        trim: false,
        collapseWhitespace: true,
        accentFold: false,
      }),
    ).toBe('a b c d')
  })

  it('caseInsensitive: lowercases ASCII', () => {
    expect(
      normalizeText('HELLO', {
        caseInsensitive: true,
        trim: false,
        collapseWhitespace: false,
        accentFold: false,
      }),
    ).toBe('hello')
  })

  it('accentFold: strips combining marks from base characters', () => {
    expect(
      normalizeText('résumé', {
        caseInsensitive: false,
        trim: false,
        collapseWhitespace: false,
        accentFold: true,
      }),
    ).toBe('resume')
  })

  it('accentFold preserves base characters (idempotent on plain ASCII)', () => {
    expect(
      normalizeText('plain', {
        caseInsensitive: false,
        trim: false,
        collapseWhitespace: false,
        accentFold: true,
      }),
    ).toBe('plain')
  })

  it('handles empty strings without throwing', () => {
    expect(normalizeText('')).toBe('')
  })

  it('handles whitespace-only strings (trim + collapse → empty)', () => {
    expect(normalizeText('   \n\t  ')).toBe('')
  })
})

describe('editDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(editDistance('hello', 'hello')).toBe(0)
  })

  it('returns the length of the non-empty string when one is empty', () => {
    expect(editDistance('', 'hello')).toBe(5)
    expect(editDistance('hello', '')).toBe(5)
  })

  it('returns 0 for two empty strings', () => {
    expect(editDistance('', '')).toBe(0)
  })

  it('counts a single substitution', () => {
    expect(editDistance('kitten', 'sitten')).toBe(1)
  })

  it('counts the canonical kitten→sitting example as 3', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })

  it('counts insertions', () => {
    expect(editDistance('abc', 'abcd')).toBe(1)
  })

  it('counts deletions', () => {
    expect(editDistance('abcd', 'abc')).toBe(1)
  })

  it('is symmetric: distance(a,b) === distance(b,a)', () => {
    expect(editDistance('quick', 'brown')).toBe(editDistance('brown', 'quick'))
    expect(editDistance('a', 'abcdef')).toBe(editDistance('abcdef', 'a'))
  })

  it('handles long-string comparisons (short-side-as-b optimization path)', () => {
    expect(editDistance('the quick brown fox', 'the')).toBe(16)
  })
})
