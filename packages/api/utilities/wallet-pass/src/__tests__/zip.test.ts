import { describe, expect, it } from 'vitest'

import { buildZipBuffer, crc32, sha1Hex } from '../zip.js'

const SIG_LOCAL_FILE = 0x04034b50
const SIG_CENTRAL_DIR = 0x02014b50
const SIG_END_OF_CENTRAL_DIR = 0x06054b50

describe('crc32', () => {
  it('returns 0 for empty input', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0)
  })

  it('matches known CRC-32 for "123456789" → 0xCBF43926', () => {
    // Standard reference value for CRC-32/IEEE.
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926)
  })

  it('matches known CRC-32 for "Hello world" → 0x8BD69E52', () => {
    expect(crc32(Buffer.from('Hello world'))).toBe(0x8bd69e52)
  })

  it('returns an unsigned 32-bit integer (no negative numbers)', () => {
    const out = crc32(Buffer.from('arbitrary bytes here'))
    expect(out).toBeGreaterThanOrEqual(0)
    expect(out).toBeLessThanOrEqual(0xffffffff)
  })

  it('differs for differing inputs (sanity)', () => {
    expect(crc32(Buffer.from('a'))).not.toBe(crc32(Buffer.from('b')))
  })
})

describe('sha1Hex', () => {
  it('returns 40-char lowercase hex', () => {
    const out = sha1Hex(Buffer.from('hello'))
    expect(out).toHaveLength(40)
    expect(/^[0-9a-f]{40}$/.test(out)).toBe(true)
  })

  it('matches the canonical SHA-1("hello")', () => {
    expect(sha1Hex(Buffer.from('hello'))).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })

  it('is deterministic', () => {
    const a = sha1Hex(Buffer.from('reproducible'))
    const b = sha1Hex(Buffer.from('reproducible'))
    expect(a).toBe(b)
  })
})

describe('buildZipBuffer', () => {
  it('returns a buffer starting with the local-file-header signature', () => {
    const zip = buildZipBuffer([{ name: 'hello.txt', data: Buffer.from('Hello') }])
    expect(zip.readUInt32LE(0)).toBe(SIG_LOCAL_FILE)
  })

  it('returns a buffer with end-of-central-directory in the last 22 bytes', () => {
    const zip = buildZipBuffer([{ name: 'hello.txt', data: Buffer.from('Hello') }])
    expect(zip.readUInt32LE(zip.length - 22)).toBe(SIG_END_OF_CENTRAL_DIR)
  })

  it('records the correct file count in the EOCD record', () => {
    const zip = buildZipBuffer([
      { name: 'a.txt', data: Buffer.from('aaa') },
      { name: 'b.txt', data: Buffer.from('bbb') },
      { name: 'c.txt', data: Buffer.from('ccc') },
    ])
    // EOCD has counts at offsets 8 (this disk) and 10 (total)
    expect(zip.readUInt16LE(zip.length - 22 + 8)).toBe(3)
    expect(zip.readUInt16LE(zip.length - 22 + 10)).toBe(3)
  })

  it('embeds file name bytes immediately after the local header (30 bytes in)', () => {
    const zip = buildZipBuffer([{ name: 'hi.txt', data: Buffer.from('x') }])
    const nameBytes = zip.slice(30, 30 + 6)
    expect(nameBytes.toString('utf8')).toBe('hi.txt')
  })

  it('uses STORE compression method (uncompressed)', () => {
    const zip = buildZipBuffer([{ name: 'a', data: Buffer.from('hello') }])
    // Compression method is at offset 8 in the local-file header.
    expect(zip.readUInt16LE(8)).toBe(0)
  })

  it('records the CRC-32 of the data in the local-file header', () => {
    const data = Buffer.from('test-content')
    const expectedCrc = crc32(data)
    const zip = buildZipBuffer([{ name: 'x.txt', data }])
    expect(zip.readUInt32LE(14)).toBe(expectedCrc) // CRC offset in local-file header
  })

  it('records the uncompressed size in both compressed + uncompressed fields (STORE)', () => {
    const data = Buffer.from('the-payload')
    const zip = buildZipBuffer([{ name: 'x.txt', data }])
    expect(zip.readUInt32LE(18)).toBe(data.length) // compressed size
    expect(zip.readUInt32LE(22)).toBe(data.length) // uncompressed size
  })

  it('includes central-directory signature(s) before EOCD', () => {
    const zip = buildZipBuffer([
      { name: 'a.txt', data: Buffer.from('1') },
      { name: 'b.txt', data: Buffer.from('2') },
    ])
    // Scan for at least one central-dir signature (there should be N).
    let count = 0
    for (let i = 0; i < zip.length - 4; i++) {
      if (zip.readUInt32LE(i) === SIG_CENTRAL_DIR) count++
    }
    expect(count).toBe(2)
  })

  it('handles UTF-8 filenames (multi-byte chars use byte length)', () => {
    const name = '日本.txt'
    const zip = buildZipBuffer([{ name, data: Buffer.from('x') }])
    const nameLength = Buffer.byteLength(name, 'utf8')
    expect(zip.readUInt16LE(26)).toBe(nameLength)
    expect(zip.slice(30, 30 + nameLength).toString('utf8')).toBe(name)
  })

  it('handles an empty entries array (produces valid empty zip)', () => {
    const zip = buildZipBuffer([])
    expect(zip.readUInt32LE(0)).toBe(SIG_END_OF_CENTRAL_DIR) // EOCD only, no local headers
    expect(zip.readUInt16LE(8)).toBe(0) // entry count
  })

  it('handles entries with empty data buffers', () => {
    const zip = buildZipBuffer([{ name: 'empty.txt', data: Buffer.alloc(0) }])
    expect(zip.readUInt32LE(0)).toBe(SIG_LOCAL_FILE)
    expect(zip.readUInt32LE(18)).toBe(0) // compressed size
    expect(zip.readUInt32LE(22)).toBe(0) // uncompressed size
    // CRC-32 of empty buffer is 0
    expect(zip.readUInt32LE(14)).toBe(0)
  })
})
