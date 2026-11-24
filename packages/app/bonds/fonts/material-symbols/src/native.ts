/**
 * Material Symbols for React Native: static instances of the font (a device draws neither
 * variable axes nor ligatures) that the app loads with expo-font, and the glyph table a device
 * draws them by.
 *
 * @example
 * ```tsx
 * import { useFonts } from 'expo-font'
 * import { setFont } from '@molecule/app-fonts'
 * import { nativeFont } from '@molecule/app-fonts-material-symbols/native'
 *
 * setFont(nativeFont)
 * const [loaded] = useFonts(nativeFont.nativeFiles ?? {})
 * ```
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import outlined from '../fonts/MaterialSymbolsOutlined.ttf'
import filled from '../fonts/MaterialSymbolsOutlined-Filled.ttf'
import { FILLED_FAMILY, glyphs } from './glyphs.js'
import { font } from './provider.js'

/** Material Symbols for React Native, with its font files for expo-font. */
export const nativeFont: FontDefinition = {
  ...font,
  source: { type: 'system' },
  glyphs,
  nativeFiles: { [font.family]: outlined, [FILLED_FAMILY]: filled },
}
