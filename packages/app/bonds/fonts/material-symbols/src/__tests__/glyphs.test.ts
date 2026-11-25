import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

import { GLYPH_ENTRIES, GLYPHS_SOURCE_SHA256 } from '../glyphs.data.js'
import { FILLED_FAMILY, glyphCodepoint } from '../glyphs.js'
import { nativeFont } from '../native.js'
import { font } from '../provider.js'

const SRC = fileURLToPath(new URL('..', import.meta.url))

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

  it('are on the React Native definition, with the filled family, and not on the web one', () => {
    expect(nativeFont.glyphs?.codepoint('chat')).toBe(0xe0b7)
    expect(nativeFont.glyphs?.filledFamily).toBe(FILLED_FAMILY)
    // A browser draws by ligature name.
    expect(font.glyphs).toBeUndefined()
  })

  // 2026-11-25: the web definition referenced the glyph table, so every browser bundle that set
  // the icon font carried its 79 KB of codepoints.
  it('stay out of a browser bundle that sets the icon font, and are in a device bundle', async () => {
    const bundle = async (contents: string): Promise<string> => {
      const result = await build({
        stdin: { contents, resolveDir: SRC, loader: 'ts' },
        bundle: true,
        write: false,
        format: 'esm',
        outdir: 'out',
        loader: { '.ttf': 'file', '.woff2': 'file' },
        external: ['@molecule/app-fonts'],
        logLevel: 'silent',
      })
      return result.outputFiles.map((file) => file.text).join('\n')
    }
    const firstEntry = GLYPH_ENTRIES.slice(0, GLYPH_ENTRIES.indexOf(';'))
    const web = await bundle(
      "import { font } from './index.js'\nimport { setFont } from '@molecule/app-fonts'\nsetFont(font)\n",
    )
    expect(web).toContain('Material Symbols Outlined')
    expect(web).not.toContain(firstEntry)
    const device = await bundle(
      "import { nativeFont } from './native.js'\nimport { setFont } from '@molecule/app-fonts'\nsetFont(nativeFont)\n",
    )
    expect(device).toContain(firstEntry)
  })

  it('ship the static instances a device loads', () => {
    for (const file of ['MaterialSymbolsOutlined.ttf', 'MaterialSymbolsOutlined-Filled.ttf']) {
      expect(
        readFileSync(new URL(`../../fonts/${file}`, import.meta.url)).byteLength,
      ).toBeGreaterThan(100_000)
    }
  })
})
