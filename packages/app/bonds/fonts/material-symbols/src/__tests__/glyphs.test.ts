import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { GLYPH_ENTRIES, GLYPHS_SOURCE_SHA256 } from '../glyphs.data.js'
import { FILLED_FAMILY, glyphCodepoint } from '../glyphs.js'
import { font } from '../provider.js'

describe('Material Symbols glyphs', () => {
  it('were read from the woff2 this package ships (run scripts/build-native-fonts.py when it changes)', () => {
    const woff2 = readFileSync(
      new URL('../../fonts/MaterialSymbolsOutlined.woff2', import.meta.url),
    )
    expect(createHash('sha256').update(woff2).digest('hex')).toBe(GLYPHS_SOURCE_SHA256)
  })

  it('draw each name by its codepoint', () => {
    expect(GLYPH_ENTRIES.split(';').length).toBeGreaterThan(4000)
    expect(glyphCodepoint('check_circle')).toBe(0xe86c)
    expect(glyphCodepoint('home')).toBe(0xe88a)
    expect(glyphCodepoint('settings')).toBe(0xe8b8)
  })

  it('draw nothing for a name the font does not have', () => {
    expect(glyphCodepoint('no_such_icon')).toBeUndefined()
    expect(glyphCodepoint('')).toBeUndefined()
  })

  it('are on the font definition, with the filled family', () => {
    expect(font.glyphs?.codepoint('chat')).toBe(0xe0b7)
    expect(font.glyphs?.filledFamily).toBe(FILLED_FAMILY)
  })

  it('ship the static instances a device loads', () => {
    for (const file of ['MaterialSymbolsOutlined.ttf', 'MaterialSymbolsOutlined-Filled.ttf']) {
      expect(
        readFileSync(new URL(`../../fonts/${file}`, import.meta.url)).byteLength,
      ).toBeGreaterThan(100_000)
    }
  })
})
