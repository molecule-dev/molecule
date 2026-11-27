/**
 * GlyphIcon: a glyph of the icon font.
 *
 * @module
 */

import type { ReactElement } from 'react'
import { Text as NativeText } from 'react-native'

import { getFont } from '@molecule/app-fonts'
import { getClassMap, type GlyphIconProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { registerInline } from './flow.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  splitClasses,
  textElementClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementRefProps } from './types.js'

/** Glyph names already reported as missing from the icon font. */
const REPORTED = new Set<string>()

/**
 * A glyph of the icon font: a native `Text` drawing the glyph's codepoint in the icon font the app
 * set (`setFont` with an `icon` font that has `glyphs`, such as
 * `@molecule/app-fonts-material-symbols/native`), since a device draws neither ligatures nor
 * variable axes. A name the font does not draw renders nothing.
 *
 * @param props - See {@link GlyphIconProps}.
 * @returns The element, or `null`.
 */
export function GlyphIcon(props: GlyphIconProps & ElementRefProps): ReactElement | null {
  const { name, filled, className, style, webStyle, ref } = props
  const cm = getClassMap()
  const split = splitClasses(
    cm.cn(cm.iconGlyphFont, useTagClasses(className, 'span')),
    useInheritedText(),
    dataAttributes(props),
  )
  const nativeRef = useNativeRef<NativeText>(ref)
  const gridStyle = useGridCell()
  const font = getFont('icon')
  const codepoint = font?.glyphs?.codepoint(name)
  if (!font || codepoint === undefined) {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && !REPORTED.has(name)) {
      REPORTED.add(name)
      console.error(
        font?.glyphs
          ? `GlyphIcon: the icon font "${font.family}" has no glyph named "${name}".`
          : `GlyphIcon "${name}": no icon font with glyphs is set. Call setFont() with one (nativeFont from @molecule/app-fonts-material-symbols/native) and load its nativeFiles with expo-font.`,
      )
    }
    return null
  }
  const family = filled ? (font.glyphs?.filledFamily ?? font.family) : font.family
  const own = nativeStyle(style, webStyle)
  return (
    <NativeText
      {...nativeAccessibility(props, 'span')}
      ref={nativeRef}
      className={textElementClasses(split)}
      style={[{ fontFamily: family }, own, gridStyle]}
    >
      {String.fromCodePoint(codepoint)}
    </NativeText>
  )
}

registerInline(GlyphIcon, () => 'text')
