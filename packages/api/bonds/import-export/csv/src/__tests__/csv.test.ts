import { describe, expect, it } from 'vitest'

import { formatCSV, formatExcel, parseCSV } from '../csv.js'

describe('parseCSV', () => {
  it('should parse simple CSV', () => {
    const csv = 'name,age\nAlice,30\nBob,25'
    const rows = parseCSV(csv)
    expect(rows).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('should handle quoted fields with commas', () => {
    const csv = 'name,city\n"Smith, John","New York"'
    const rows = parseCSV(csv)
    expect(rows).toEqual([{ name: 'Smith, John', city: 'New York' }])
  })

  it('should handle escaped quotes', () => {
    const csv = 'name,desc\nAlice,"Said ""hello"""'
    const rows = parseCSV(csv)
    expect(rows).toEqual([{ name: 'Alice', desc: 'Said "hello"' }])
  })

  it('should handle newlines in quoted fields', () => {
    const csv = 'name,note\nAlice,"Line 1\nLine 2"'
    const rows = parseCSV(csv)
    expect(rows).toEqual([{ name: 'Alice', note: 'Line 1\nLine 2' }])
  })

  it('should handle CRLF line endings', () => {
    const csv = 'name,age\r\nAlice,30\r\nBob,25'
    const rows = parseCSV(csv)
    expect(rows).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('should return empty array for empty input', () => {
    expect(parseCSV('')).toEqual([])
  })

  it('should return empty array for header-only input', () => {
    expect(parseCSV('name,age')).toEqual([])
  })

  it('should handle custom delimiter', () => {
    const csv = 'name;age\nAlice;30'
    const rows = parseCSV(csv, ';')
    expect(rows).toEqual([{ name: 'Alice', age: '30' }])
  })

  it('should handle missing trailing fields', () => {
    const csv = 'a,b,c\n1,2'
    const rows = parseCSV(csv)
    expect(rows).toEqual([{ a: '1', b: '2', c: '' }])
  })
})

describe('formatCSV', () => {
  it('should format simple rows', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    const csv = formatCSV(rows)
    expect(csv).toBe('name,age\nAlice,30\nBob,25')
  })

  it('should escape commas in values', () => {
    const rows = [{ name: 'Smith, John', city: 'NY' }]
    const csv = formatCSV(rows)
    expect(csv).toContain('"Smith, John"')
  })

  it('should escape quotes in values', () => {
    const rows = [{ desc: 'Said "hello"' }]
    const csv = formatCSV(rows)
    expect(csv).toContain('"Said ""hello"""')
  })

  it('should handle null and undefined', () => {
    const rows = [{ a: null, b: undefined }]
    const csv = formatCSV(rows)
    expect(csv).toBe('a,b\n,')
  })

  it('should return empty string for empty array', () => {
    expect(formatCSV([])).toBe('')
  })

  it('should use specified columns', () => {
    const rows = [{ a: 1, b: 2, c: 3 }]
    const csv = formatCSV(rows, ['c', 'a'])
    expect(csv).toBe('c,a\n3,1')
  })

  it('should use custom delimiter', () => {
    const rows = [{ name: 'Alice', age: 30 }]
    const csv = formatCSV(rows, undefined, ';')
    expect(csv).toBe('name;age\nAlice;30')
  })

  it('should escape values containing the custom delimiter', () => {
    const rows = [{ name: 'A;B', age: 30 }]
    const csv = formatCSV(rows, undefined, ';')
    expect(csv).toBe('name;age\n"A;B";30')
  })
})

describe('formatExcel', () => {
  it('should produce XML Spreadsheet 2003 format', () => {
    const rows = [{ name: 'Alice', score: 42 }]
    const xml = formatExcel(rows)
    expect(xml).toContain('<?xml version="1.0"?>')
    expect(xml).toContain('Excel.Sheet')
    expect(xml).toContain('Alice')
    expect(xml).toContain('42')
  })

  it('should use Number type for numeric values', () => {
    const rows = [{ label: 'A', value: 9.99 }]
    const xml = formatExcel(rows)
    expect(xml).toContain('ss:Type="String"')
    expect(xml).toContain('ss:Type="Number"')
  })

  it('should escape XML special characters', () => {
    const rows = [{ name: 'A & B <test>', value: 1 }]
    const xml = formatExcel(rows)
    expect(xml).toContain('A &amp; B &lt;test&gt;')
  })

  it('should handle empty rows', () => {
    const xml = formatExcel([])
    expect(xml).toContain('<?xml version="1.0"?>')
    expect(xml).toContain('Excel.Sheet')
  })

  it('should handle null and undefined values', () => {
    const rows = [{ a: null, b: undefined }]
    const xml = formatExcel(rows)
    expect(xml).toContain('<Data ss:Type="String"></Data>')
  })

  it('should use specified columns', () => {
    const rows = [{ a: 1, b: 2, c: 3 }]
    const xml = formatExcel(rows, ['c', 'a'])
    const headerMatch = xml.match(/<Row>(<Cell>.*?<\/Cell>)+<\/Row>/)?.[0] ?? ''
    expect(headerMatch).toContain('>c<')
    expect(headerMatch).toContain('>a<')
  })
})
