/**
 * Material Symbols' glyphs by name, for renderers that draw them by codepoint.
 *
 * @module
 */

import type { FontGlyphs } from '@molecule/app-fonts'

import { GLYPH_ENTRIES } from './glyphs.data.js'

/** The family of the filled static instance (`fonts/MaterialSymbolsOutlined-Filled.ttf`). */
export const FILLED_FAMILY = 'Material Symbols Outlined Filled'

/** The glyph table, read from {@link GLYPH_ENTRIES} on first use. */
let table: Map<string, number> | null = null

/**
 * The codepoint that draws a Material Symbols glyph name.
 *
 * @param name - The glyph name (`check_circle`).
 * @returns The codepoint, or `undefined` for a name the font does not draw.
 */
export function glyphCodepoint(name: string): number | undefined {
  if (!table) {
    table = new Map()
    for (const entry of GLYPH_ENTRIES.split(';')) {
      const colon = entry.indexOf(':')
      table.set(entry.slice(0, colon), Number.parseInt(entry.slice(colon + 1), 16))
    }
  }
  return table.get(name)
}

/** Material Symbols' glyphs, for {@link FontDefinition.glyphs}. */
export const glyphs: FontGlyphs = { codepoint: glyphCodepoint, filledFamily: FILLED_FAMILY }
