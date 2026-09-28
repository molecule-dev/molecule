import { describe, expect, it } from 'vitest'

import {
  extractFieldText,
  filterFieldsOf,
  matchesFilter,
  matchesFilters,
  matchesText,
  parseQuery,
  tokenize,
} from '../query.js'

describe('tokenize', () => {
  it('splits on whitespace and keeps quoted runs together', () => {
    expect(tokenize('a  "b c" d:"e f" -"g h"')).toEqual(['a', '"b c"', 'd:"e f"', '-"g h"'])
  })

  it('tolerates an unclosed quote', () => {
    expect(tokenize('a "b c')).toEqual(['a', '"b c'])
  })
})

describe('parseQuery', () => {
  it('separates terms, phrases, exclusions and filters', () => {
    const q = parseQuery('oauth category:auth -deprecated "sign in" -"magic link" type:bond,core')
    expect(q.text).toBe('oauth')
    expect(q.phrases).toEqual(['sign in'])
    expect(q.exclude).toEqual(['deprecated', 'magic link'])
    expect(q.filters).toEqual([
      { field: 'category', values: ['auth'] },
      { field: 'type', values: ['bond', 'core'] },
    ])
    expect(q.raw).toBe('oauth category:auth -deprecated "sign in" -"magic link" type:bond,core')
  })

  it('negates a filter with a leading dash', () => {
    expect(parseQuery('-category:i18n').filters).toEqual([
      { field: 'category', values: ['i18n'], negate: true },
    ])
  })

  it('quotes a filter value', () => {
    expect(parseQuery('label:"Feature flags"').filters).toEqual([
      { field: 'label', values: ['Feature flags'] },
    ])
  })

  it('keeps an unknown field:value as text when filter fields are given', () => {
    const q = parseQuery('re:act category:auth', { filterFields: ['category'] })
    expect(q.text).toBe('re:act')
    expect(q.filters).toEqual([{ field: 'category', values: ['auth'] }])
  })

  it('treats every field:value as a filter when no filter fields are given', () => {
    expect(parseQuery('re:act').filters).toEqual([{ field: 're', values: ['act'] }])
  })

  it('keeps a lone dash, an empty filter and empty quotes out of the way', () => {
    const q = parseQuery('- category: "" x')
    expect(q.text).toBe('- x')
    expect(parseQuery('re: x', { filterFields: ['category'] }).text).toBe('re: x')
    expect(q.filters).toEqual([])
    expect(q.phrases).toEqual([])
  })

  it('returns empty parts for empty text', () => {
    expect(parseQuery('   ')).toEqual({
      raw: '   ',
      text: '',
      phrases: [],
      exclude: [],
      filters: [],
    })
  })
})

describe('filters', () => {
  const doc = { name: 'app-auth', category: 'auth', tags: ['OAuth', 'sessions'], n: 3 }

  it('matches whole values case-insensitively, on strings and array elements', () => {
    expect(matchesFilter(doc, { field: 'category', values: ['AUTH'] })).toBe(true)
    expect(matchesFilter(doc, { field: 'category', values: ['aut'] })).toBe(false)
    expect(matchesFilter(doc, { field: 'tags', values: ['oauth'] })).toBe(true)
    expect(matchesFilter(doc, { field: 'n', values: ['3'] })).toBe(true)
  })

  it('matches a prefix with a trailing star and ORs several values', () => {
    expect(matchesFilter(doc, { field: 'category', values: ['au*'] })).toBe(true)
    expect(matchesFilter(doc, { field: 'category', values: ['x', 'auth'] })).toBe(true)
  })

  it('negates', () => {
    expect(matchesFilter(doc, { field: 'category', values: ['auth'], negate: true })).toBe(false)
    expect(
      matchesFilters(doc, [
        { field: 'category', values: ['auth'] },
        { field: 'tags', values: ['nope'] },
      ]),
    ).toBe(false)
  })

  it('fails on a missing field', () => {
    expect(matchesFilter(doc, { field: 'missing', values: ['x'] })).toBe(false)
  })
})

describe('matchesText', () => {
  const doc = { name: 'app-auth', description: 'Sign in with OAuth and magic links.' }
  const fields = ['name', 'description']

  it('requires phrases verbatim and forbids excluded terms as word prefixes', () => {
    expect(matchesText(doc, fields, ['sign in'], [])).toBe(true)
    expect(matchesText(doc, fields, ['in sign'], [])).toBe(false)
    expect(matchesText(doc, fields, [], ['magic'])).toBe(false)
    expect(matchesText(doc, fields, [], ['agic'])).toBe(true)
    expect(matchesText(doc, fields, [], ['app-auth'])).toBe(false)
  })

  it('passes trivially with nothing to check', () => {
    expect(matchesText(doc, fields, [], [])).toBe(true)
  })
})

describe('helpers', () => {
  it('extracts arrays as space-joined text and nothing as empty', () => {
    expect(extractFieldText({ a: ['x', 2, null] }, 'a')).toBe('x 2 ')
    expect(extractFieldText({ a: 1 }, 'a')).toBe('1')
    expect(extractFieldText({}, 'a')).toBe('')
  })

  it('defaults filter fields to the searched fields', () => {
    expect(filterFieldsOf({ idField: 'id', fields: ['a', 'b'] })).toEqual(['a', 'b'])
    expect(filterFieldsOf({ idField: 'id', fields: ['a'], filterFields: ['c'] })).toEqual(['c'])
  })
})
