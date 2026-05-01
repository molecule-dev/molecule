import { describe, expect, it } from 'vitest'

import {
  columnIndexToLetters,
  columnLettersToIndex,
  coordKey,
  formatCellReference,
  iterateRange,
  parseCellRange,
  parseCellReference,
} from '../references.js'

describe('columnLettersToIndex', () => {
  it.each([
    ['A', 0],
    ['Z', 25],
    ['AA', 26],
    ['AZ', 51],
    ['BA', 52],
    ['XFD', 16383],
  ])('%s → %d', (input, expected) => {
    expect(columnLettersToIndex(input)).toBe(expected)
  })

  it('is case-insensitive', () => {
    expect(columnLettersToIndex('aa')).toBe(26)
  })

  it('throws on invalid letters', () => {
    expect(() => columnLettersToIndex('A1')).toThrow()
  })
})

describe('columnIndexToLetters', () => {
  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [701, 'ZZ'],
    [702, 'AAA'],
    [16383, 'XFD'],
  ])('%d → %s', (input, expected) => {
    expect(columnIndexToLetters(input)).toBe(expected)
  })

  it('round-trips with columnLettersToIndex', () => {
    for (let i = 0; i < 1000; i += 17) {
      expect(columnLettersToIndex(columnIndexToLetters(i))).toBe(i)
    }
  })

  it('throws on negative index', () => {
    expect(() => columnIndexToLetters(-1)).toThrow()
  })
})

describe('parseCellReference', () => {
  it('parses A1', () => {
    expect(parseCellReference('A1')).toEqual({ col: 0, row: 0 })
  })
  it('parses $A$1', () => {
    expect(parseCellReference('$A$1')).toEqual({ col: 0, row: 0 })
  })
  it('parses BC42', () => {
    expect(parseCellReference('BC42')).toEqual({ col: 54, row: 41 })
  })
  it('returns null for invalid input', () => {
    expect(parseCellReference('1A')).toBeNull()
    expect(parseCellReference('AA')).toBeNull()
    expect(parseCellReference('')).toBeNull()
  })
})

describe('parseCellRange', () => {
  it('parses A1:B5', () => {
    expect(parseCellRange('A1:B5')).toEqual({
      start: { col: 0, row: 0 },
      end: { col: 1, row: 4 },
    })
  })
  it('normalizes reversed corners', () => {
    expect(parseCellRange('B5:A1')).toEqual({
      start: { col: 0, row: 0 },
      end: { col: 1, row: 4 },
    })
  })
  it('returns null for malformed ranges', () => {
    expect(parseCellRange('A1')).toBeNull()
    expect(parseCellRange('A1:')).toBeNull()
  })
})

describe('iterateRange', () => {
  it('yields all coords in row-major order', () => {
    const coords = [...iterateRange({ start: { col: 0, row: 0 }, end: { col: 1, row: 1 } })]
    expect(coords).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ])
  })
})

describe('formatCellReference', () => {
  it('formats coord back to A1', () => {
    expect(formatCellReference({ col: 0, row: 0 })).toBe('A1')
    expect(formatCellReference({ col: 26, row: 41 })).toBe('AA42')
  })
})

describe('coordKey', () => {
  it('produces stable keys', () => {
    expect(coordKey({ col: 3, row: 7 })).toBe('3,7')
  })
})
