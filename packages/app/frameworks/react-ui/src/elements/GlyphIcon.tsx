/**
 * GlyphIcon: a glyph of the icon font.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import { getClassMap, type GlyphIconProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementRefProps } from './types.js'

/** The icon font's filled form, by its `FILL` axis. */
const FILLED = { fontVariationSettings: "'FILL' 1" } as const

/**
 * A glyph of the icon font: a `span` with the ClassMap's `iconGlyphFont` holding the glyph name,
 * which the font draws by ligature.
 *
 * @param props - See {@link GlyphIconProps}.
 * @returns The element.
 */
export function GlyphIcon({
  name,
  filled,
  className,
  style,
  webStyle,
  ref,
  ...props
}: GlyphIconProps & ElementRefProps): ReactElement {
  const cm = getClassMap()
  return createElement(
    'span',
    {
      ...props,
      ref: useElementRef(ref),
      className: cm.cn(cm.iconGlyphFont, className),
      style: webElementStyle(style, filled ? { ...FILLED, ...webStyle } : webStyle),
    },
    name,
  )
}
