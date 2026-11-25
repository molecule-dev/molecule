/**
 * GlyphIcon: a glyph of the icon font.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import { getClassMap, type GlyphIconProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes, webElementStyle } from './style.js'
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
  ref,
  ...authored
}: GlyphIconProps & ElementRefProps): ReactElement {
  const cm = getClassMap()
  const { filled, ...props } = authored
  const { className, style, webStyle } = props
  return createElement(
    'span',
    webElementAttributes(
      filled ? authored : props,
      {
        ref: useElementRef(ref),
        className: cm.cn(cm.iconGlyphFont, className),
        ...(filled && { style: webElementStyle(style, { ...FILLED, ...webStyle }) }),
      },
      { filled: 'style' },
    ),
    name,
  )
}
