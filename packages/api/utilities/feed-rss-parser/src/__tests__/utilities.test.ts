import { describe, expect, it } from 'vitest'

import {
  attrOf,
  firstText,
  parseItunesDuration,
  synthesizeItemId,
  textOf,
  toArray,
  toIsoDate,
} from '../utilities.js'

describe('toArray', () => {
  it('null/undefined → []', () => {
    expect(toArray(null)).toEqual([])
    expect(toArray(undefined)).toEqual([])
  })

  it('scalar → [scalar]', () => {
    expect(toArray(42)).toEqual([42])
    expect(toArray('x')).toEqual(['x'])
  })

  it('array → array unchanged', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('empty array → empty array (not wrapped)', () => {
    expect(toArray([])).toEqual([])
  })
})

describe('textOf', () => {
  it('returns undefined for null/undefined', () => {
    expect(textOf(null)).toBeUndefined()
    expect(textOf(undefined)).toBeUndefined()
  })

  it('returns trimmed string', () => {
    expect(textOf('  hello  ')).toBe('hello')
  })

  it('returns undefined for empty / whitespace-only string', () => {
    expect(textOf('')).toBeUndefined()
    expect(textOf('   ')).toBeUndefined()
  })

  it('coerces number / boolean primitives to string', () => {
    expect(textOf(42)).toBe('42')
    expect(textOf(true)).toBe('true')
    expect(textOf(false)).toBe('false')
  })

  it('extracts #text from fast-xml-parser object form', () => {
    expect(textOf({ '#text': 'hello', '@_attr': 'x' })).toBe('hello')
  })

  it('returns undefined when #text is empty/whitespace', () => {
    expect(textOf({ '#text': '' })).toBeUndefined()
    expect(textOf({ '#text': '   ' })).toBeUndefined()
  })

  it('returns undefined for object without #text', () => {
    expect(textOf({ '@_attr': 'x' })).toBeUndefined()
  })
})

describe('firstText', () => {
  it('unwraps single-element arrays', () => {
    expect(firstText(['hello'])).toBe('hello')
  })

  it('returns the first non-empty value in an array', () => {
    expect(firstText(['', '  ', 'first', 'second'])).toBe('first')
  })

  it('returns undefined for an empty array', () => {
    expect(firstText([])).toBeUndefined()
  })

  it('passes through to textOf for non-array values', () => {
    expect(firstText('plain')).toBe('plain')
    expect(firstText({ '#text': 'x' })).toBe('x')
  })
})

describe('attrOf', () => {
  it('extracts attribute prefixed with @_', () => {
    expect(attrOf({ '@_href': 'https://x.test' }, 'href')).toBe('https://x.test')
  })

  it('returns undefined for missing attribute', () => {
    expect(attrOf({ '@_href': 'x' }, 'src')).toBeUndefined()
  })

  it('trims whitespace from string attributes', () => {
    expect(attrOf({ '@_href': '  https://x  ' }, 'href')).toBe('https://x')
  })

  it('returns undefined for empty/whitespace string attribute', () => {
    expect(attrOf({ '@_href': '   ' }, 'href')).toBeUndefined()
  })

  it('coerces numeric/boolean attributes to string', () => {
    expect(attrOf({ '@_count': 42 }, 'count')).toBe('42')
    expect(attrOf({ '@_active': true }, 'active')).toBe('true')
  })

  it('returns undefined for null/undefined/non-object input', () => {
    expect(attrOf(null, 'x')).toBeUndefined()
    expect(attrOf(undefined, 'x')).toBeUndefined()
    expect(attrOf('not an object', 'x')).toBeUndefined()
  })
})

describe('toIsoDate', () => {
  it('returns undefined for empty / undefined', () => {
    expect(toIsoDate(undefined)).toBeUndefined()
    expect(toIsoDate('')).toBeUndefined()
  })

  it('parses RFC 822 (RSS pubDate)', () => {
    const out = toIsoDate('Mon, 28 Apr 2026 15:00:00 GMT')
    expect(out).toBe('2026-04-28T15:00:00.000Z')
  })

  it('parses RFC 3339 (Atom)', () => {
    expect(toIsoDate('2026-05-13T10:00:00Z')).toBe('2026-05-13T10:00:00.000Z')
  })

  it('returns undefined for unparseable input', () => {
    expect(toIsoDate('not a date')).toBeUndefined()
  })
})

describe('parseItunesDuration', () => {
  it('returns undefined for empty / whitespace input', () => {
    expect(parseItunesDuration(undefined)).toBeUndefined()
    expect(parseItunesDuration('')).toBeUndefined()
    expect(parseItunesDuration('   ')).toBeUndefined()
  })

  it('parses bare integer seconds', () => {
    expect(parseItunesDuration('3600')).toBe(3600)
  })

  it('parses MM:SS → seconds', () => {
    expect(parseItunesDuration('42:30')).toBe(42 * 60 + 30)
  })

  it('parses HH:MM:SS → seconds', () => {
    expect(parseItunesDuration('01:42:30')).toBe(3600 + 42 * 60 + 30)
  })

  it('returns undefined for non-numeric segments', () => {
    expect(parseItunesDuration('hours:42:30')).toBeUndefined()
    expect(parseItunesDuration('42:thirty')).toBeUndefined()
  })

  it('returns undefined for unsupported part count (1 or 4)', () => {
    expect(parseItunesDuration('1:2:3:4')).toBeUndefined()
  })

  it('trims whitespace around colon-separated segments', () => {
    expect(parseItunesDuration(' 1 : 2 : 3 ')).toBe(3723)
  })
})

describe('synthesizeItemId', () => {
  it('returns a 40-char hex string (SHA-1)', () => {
    const id = synthesizeItemId('Title', '2026-05-13T10:00:00Z')
    expect(id).toHaveLength(40)
    expect(/^[0-9a-f]{40}$/.test(id)).toBe(true)
  })

  it('is deterministic for the same inputs', () => {
    const a = synthesizeItemId('Title', '2026-05-13T10:00:00Z')
    const b = synthesizeItemId('Title', '2026-05-13T10:00:00Z')
    expect(a).toBe(b)
  })

  it('differs when title differs', () => {
    const a = synthesizeItemId('Title A', '2026-05-13T10:00:00Z')
    const b = synthesizeItemId('Title B', '2026-05-13T10:00:00Z')
    expect(a).not.toBe(b)
  })

  it('differs when publishedAt differs', () => {
    const a = synthesizeItemId('Title', '2026-05-13T10:00:00Z')
    const b = synthesizeItemId('Title', '2026-05-13T10:00:01Z')
    expect(a).not.toBe(b)
  })

  it('handles missing publishedAt', () => {
    const out = synthesizeItemId('Title', undefined)
    expect(out).toHaveLength(40)
  })
})
