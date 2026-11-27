/**
 * Native styles of the elements.
 *
 * @module
 */

import { Platform, processColor, type TextStyle as NativeTextStyle } from 'react-native'

import type { BoxStyle, ElementLength, TextStyle, WebStyle } from '@molecule/app-ui'

/**
 * Whether a value is a percentage length (`'50%'`).
 *
 * @param value - A CSS value.
 * @returns Whether it is one.
 */
function isPercent(value: unknown): value is `${number}%` {
  return typeof value === 'string' && /^-?\d+(?:\.\d+)?%$/.test(value)
}

/** The web's root font size, which a `rem` length is a multiple of. */
const ROOT_FONT_SIZE = 16

/**
 * A CSS length a device can draw: a number, a pixel string (`'4px'` is 4), a `rem` string at the
 * web's root font size (`'2rem'` is 32) or a percentage.
 *
 * @param value - A CSS value.
 * @returns The length, or `undefined` when a device cannot draw it (`'2em'`, `calc()`).
 */
function length(value: unknown): ElementLength | undefined {
  if (typeof value === 'number') return value
  if (isPercent(value)) return value
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?px$/.test(value))
    return Number.parseFloat(value)
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?rem$/.test(value))
    return Number.parseFloat(value) * ROOT_FONT_SIZE
  return undefined
}

/**
 * A CSS number a device can draw: a number, or a pixel string for pixel-only properties.
 *
 * @param value - A CSS value.
 * @returns The number, or `undefined`.
 */
function pixels(value: unknown): number | undefined {
  const l = length(value)
  return typeof l === 'number' ? l : undefined
}

/**
 * A plain number (`flex: 1`, `opacity: '0.5'`).
 *
 * @param value - A CSS value.
 * @returns The number, or `undefined`.
 */
function plainNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  return undefined
}

/**
 * A colour a device can draw: any string but a CSS variable or a computed one.
 *
 * @param value - A CSS value.
 * @returns The colour, or `undefined`.
 */
function color(value: unknown): string | undefined {
  return typeof value === 'string' && !/var\(|calc\(|color-mix\(/.test(value) ? value : undefined
}

/**
 * One of a closed set of keywords.
 *
 * @param value - A CSS value.
 * @param options - The keywords.
 * @returns The keyword, or `undefined`.
 */
function keyword<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return options.find((option) => option === value)
}

const LENGTH_KEYS = [
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
] as const
const MARGIN_KEYS = ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const
const PIXEL_KEYS = [
  'gap',
  'rowGap',
  'columnGap',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'fontSize',
  'letterSpacing',
] as const
const NUMBER_KEYS = ['flex', 'flexGrow', 'flexShrink', 'zIndex', 'opacity'] as const
const COLOR_KEYS = [
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'color',
] as const

/**
 * The part of an element's CSS a device can draw: the keys {@link TextStyle} names, with values a
 * device understands (pixel strings become numbers; `'2rem'`, `calc()` and `var()` are left out).
 *
 * @param css - CSS written for the web (`webStyle`).
 * @returns The native style.
 */
export function drawable(css: WebStyle): TextStyle {
  const out: TextStyle = {}
  const background = color(css.background)
  if (background && processColor(background) != null) out.backgroundColor = background
  for (const key of LENGTH_KEYS) {
    const value = length(css[key])
    if (value !== undefined) out[key] = value
  }
  for (const key of MARGIN_KEYS) {
    const value = css[key] === 'auto' ? 'auto' : length(css[key])
    if (value !== undefined) out[key] = value
  }
  for (const key of PIXEL_KEYS) {
    const value = pixels(css[key])
    if (value !== undefined) out[key] = value
  }
  for (const key of NUMBER_KEYS) {
    const value = plainNumber(css[key])
    if (value !== undefined) out[key] = value
  }
  const ratio = css.aspectRatio
  const terms = typeof ratio === 'string' ? ratio.trim().split(/\s*\/\s*/) : [ratio]
  if (terms.length <= 2) {
    const numerator = plainNumber(terms[0])
    const denominator = terms.length === 1 ? 1 : plainNumber(terms[1])
    if (numerator && denominator && numerator > 0 && denominator > 0) {
      const value = numerator / denominator
      if (Number.isFinite(value) && value > 0) out.aspectRatio = value
    }
  }
  for (const key of COLOR_KEYS) {
    const value = color(css[key])
    if (value !== undefined) out[key] = value
  }
  const basis = css.flexBasis === 'auto' ? 'auto' : length(css.flexBasis)
  if (basis !== undefined) out.flexBasis = basis
  const lineHeight = pixels(css.lineHeight)
  if (lineHeight !== undefined) out.lineHeight = `${lineHeight}px`
  const display = keyword(css.display, ['flex', 'none'] as const)
  if (display) out.display = display
  const position = keyword(css.position, ['relative', 'absolute'] as const)
  if (position) out.position = position
  const direction = keyword(css.flexDirection, [
    'row',
    'column',
    'row-reverse',
    'column-reverse',
  ] as const)
  if (direction) out.flexDirection = direction
  const wrap = keyword(css.flexWrap, ['wrap', 'nowrap', 'wrap-reverse'] as const)
  if (wrap) out.flexWrap = wrap
  const items = ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'] as const
  const alignItems = keyword(css.alignItems, items)
  if (alignItems) out.alignItems = alignItems
  const alignSelf = keyword(css.alignSelf, ['auto', ...items] as const)
  if (alignSelf) out.alignSelf = alignSelf
  const spacing = [
    'flex-start',
    'flex-end',
    'center',
    'space-between',
    'space-around',
    'space-evenly',
  ] as const
  const justify = keyword(css.justifyContent, spacing)
  if (justify) out.justifyContent = justify
  const alignContent = keyword(css.alignContent, [...spacing, 'stretch'] as const)
  if (alignContent) out.alignContent = alignContent
  const overflow = keyword(css.overflow, ['visible', 'hidden'] as const)
  if (overflow) out.overflow = overflow
  const pointerEvents = keyword(css.pointerEvents, ['auto', 'none'] as const)
  if (pointerEvents) out.pointerEvents = pointerEvents
  const borderStyle = keyword(css.borderStyle, ['solid', 'dotted', 'dashed'] as const)
  if (borderStyle) out.borderStyle = borderStyle
  const weights = [
    'normal',
    'bold',
    '100',
    '200',
    '300',
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
  ] as const
  const fontWeight = keyword(
    typeof css.fontWeight === 'number' ? String(css.fontWeight) : css.fontWeight,
    weights,
  )
  if (fontWeight) out.fontWeight = fontWeight
  const fontStyle = keyword(css.fontStyle, ['normal', 'italic'] as const)
  if (fontStyle) out.fontStyle = fontStyle
  const textAlign = keyword(css.textAlign, ['left', 'right', 'center', 'justify'] as const)
  if (textAlign) out.textAlign = textAlign
  const transform = keyword(css.textTransform, [
    'none',
    'uppercase',
    'lowercase',
    'capitalize',
  ] as const)
  if (transform) out.textTransform = transform
  const decoration = keyword(css.textDecorationLine, [
    'none',
    'underline',
    'line-through',
    'underline line-through',
  ] as const)
  if (decoration) out.textDecorationLine = decoration
  return out
}

/**
 * An element's native style: its `style`, then what a device can draw of its `webStyle` (the
 * web kit applies them in the same order).
 *
 * @param style - The element's `style`.
 * @param webStyle - The element's `webStyle`.
 * @returns The style, or `undefined` when there is none.
 */
export function nativeStyle(
  style: TextStyle | BoxStyle | undefined,
  webStyle: WebStyle | undefined,
): NativeTextStyle | undefined {
  if (!style && !webStyle) return undefined
  const merged: TextStyle = { ...style, ...(webStyle ? drawable(webStyle) : {}) }
  const { lineHeight, contentTransform, ...rest } = merged
  const out: NativeTextStyle =
    lineHeight === undefined ? rest : { ...rest, lineHeight: Number.parseFloat(lineHeight) }
  if (contentTransform) {
    const { translateX, translateY, scale } = contentTransform
    out.transform = [{ translateX }, { translateY }, { scale }]
    out.transformOrigin = [0, 0, 0]
  }
  const transform = nativeTransform(webStyle?.transform)
  return transform ? { ...out, transform } : out
}

/** One step of a native transform. */
type NativeTransformStep = Exclude<NonNullable<NativeTextStyle['transform']>, string>[number]

/**
 * A CSS `transform` a device can draw, as React Native's list of steps: `translateX`,
 * `translateY` and `translate` (pixels or percentages), `scale`, `scaleX`, `scaleY` and
 * `rotate` (degrees).
 *
 * @param css - The CSS value (`'translateX(-40%)'`).
 * @returns The steps, or `undefined` when there is none or a step is one a device cannot draw.
 */
function nativeTransform(css: unknown): NativeTransformStep[] | undefined {
  if (typeof css !== 'string' || css.trim() === '' || css.trim() === 'none') return undefined
  const steps: NativeTransformStep[] = []
  const pattern = /([a-zA-Z]+)\(([^)]*)\)/g
  let rest = css
  for (const [whole, name, body] of css.matchAll(pattern)) {
    rest = rest.replace(whole, '')
    const args = (body ?? '').split(',').map((arg) => arg.trim())
    const step = transformStep(name ?? '', args)
    if (!step) return undefined
    steps.push(...step)
  }
  return rest.trim() === '' && steps.length > 0 ? steps : undefined
}

/**
 * The native steps of one CSS transform function.
 *
 * @param name - The function's name.
 * @param args - Its arguments.
 * @returns The steps, or `undefined` when a device cannot draw it.
 */
function transformStep(name: string, args: string[]): NativeTransformStep[] | undefined {
  const [first, second] = args
  switch (name) {
    case 'translateX': {
      const x = length(first)
      return x === undefined ? undefined : [{ translateX: x }]
    }
    case 'translateY': {
      const y = length(first)
      return y === undefined ? undefined : [{ translateY: y }]
    }
    case 'translate': {
      const x = length(first)
      const y = second === undefined ? 0 : length(second)
      return x === undefined || y === undefined ? undefined : [{ translateX: x }, { translateY: y }]
    }
    case 'scale': {
      const x = plainNumber(first)
      const y = second === undefined ? x : plainNumber(second)
      if (x === undefined || y === undefined) return undefined
      return x === y ? [{ scale: x }] : [{ scaleX: x }, { scaleY: y }]
    }
    case 'scaleX': {
      const x = plainNumber(first)
      return x === undefined ? undefined : [{ scaleX: x }]
    }
    case 'scaleY': {
      const y = plainNumber(first)
      return y === undefined ? undefined : [{ scaleY: y }]
    }
    case 'rotate':
      return first !== undefined && /^-?\d+(?:\.\d+)?deg$/.test(first)
        ? [{ rotate: first }]
        : undefined
    default:
      return undefined
  }
}

/** The monospace font of the platform. */
const MONOSPACE = Platform.select({ ios: 'Menlo', default: 'monospace' })

/**
 * The defaults a browser (with the reference stylesheet's reset) gives a text tag, which a native
 * `Text` does not have.
 */
export const TEXT_TAG_STYLE: Readonly<Record<string, NativeTextStyle>> = {
  em: { fontStyle: 'italic' },
  code: { fontFamily: MONOSPACE },
  kbd: { fontFamily: MONOSPACE },
  pre: { fontFamily: MONOSPACE },
  mark: { backgroundColor: '#ffff00', color: '#000000' },
}
