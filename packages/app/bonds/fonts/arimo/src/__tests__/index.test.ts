import { describe, expect, it } from 'vitest'

import { font } from '../index.js'

describe('@molecule/app-fonts-arimo', () => {
  it('should export a FontDefinition', () => {
    expect(font).toBeDefined()
    expect(font.family).toBe('Arimo')
    expect(font.role).toBe('sans')
  })

  it('should have local font source', () => {
    expect(font.source.type).toBe('local')
    expect(font.source.faces).toBeDefined()
    expect(font.source.faces).toHaveLength(6)
  })

  it('should have fallback fonts', () => {
    expect(font.fallbacks.length).toBeGreaterThan(0)
    expect(font.fallbacks).toContain('sans-serif')
  })

  it('includes the upstream OFL notice in the package and in each served font', () => {
    const notice = new URL('../../fonts/OFL.txt', import.meta.url)
    expect(existsSync(notice)).toBe(true)
    const text = readFileSync(notice, 'utf8')
    expect(text).toContain('Copyright 2020 The Arimo Project Authors')
    expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1')
    for (const face of font.source.faces ?? []) {
      const fontBytes = readFileSync(new URL(face.file))
      const offset = fontBytes.readUInt32BE(28)
      const length = fontBytes.readUInt32BE(32)
      const metadata = brotliDecompressSync(fontBytes.subarray(offset, offset + length)).toString()
      expect(metadata).toContain('Copyright 2020 The Arimo Project Authors')
      expect(metadata).toContain('SIL OPEN FONT LICENSE Version 1.1')
    }
  })
})
import { existsSync, readFileSync } from 'node:fs'
import { brotliDecompressSync } from 'node:zlib'
