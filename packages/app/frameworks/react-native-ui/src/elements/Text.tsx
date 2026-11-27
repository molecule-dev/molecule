/**
 * Text: an element that holds text.
 *
 * @module
 */

import type { ReactElement } from 'react'
import { Text as NativeText, type TextStyle as NativeTextStyle } from 'react-native'

import type { InlineKind, TextProps } from '@molecule/app-ui'

import { useOverlayTarget } from '../platform/focus.js'
import { nativeAccessibility } from './accessibility.js'
import { registerInline } from './flow.js'
import { useGridCell } from './grid.js'
import {
  blockInInline,
  dataAttributes,
  ElementScope,
  flowOf,
  splitClasses,
  textElementClasses,
  useInheritedFontStyle,
  useInheritedText,
  useLineStart,
  useTagClasses,
} from './inherited.js'
import { useLabelPress, useLabelText } from './labels.js'
import { useNativeRef } from './ref.js'
import { nativeStyle, TEXT_TAG_STYLE } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/** Text tags that flow inline on the web; the others are blocks (a paragraph, a heading). */
const INLINE_TAGS: ReadonlySet<string> = new Set([
  'span',
  'strong',
  'em',
  'small',
  'code',
  'kbd',
  'mark',
  'label',
  'time',
])

/**
 * CSS `bolder`: the weight a `<strong>` draws at, from the weight it inherits.
 *
 * @param weight - The inherited weight.
 * @returns The bolder weight.
 */
function bolder(weight: number): '400' | '700' | '900' {
  if (weight < 350) return '400'
  if (weight < 550) return '700'
  return '900'
}

/**
 * A `<strong>`'s weight, as a browser's stylesheet gives it (`font-weight: bolder`), unless its
 * own classes set one.
 *
 * @param inherited - The text classes its container hands down.
 * @param className - Its own classes.
 * @returns Its style, or `undefined` when its classes set the weight.
 */
function strongStyle(
  inherited: string,
  className: string | undefined,
): NativeTextStyle | undefined {
  if (splitClasses(className, '').weight !== null) return undefined
  return { fontWeight: bolder(splitClasses('', inherited).weight ?? 400) }
}

/**
 * Text: a native `Text` (a heading for `h1`–`h6`) with the text classes its container hands down
 * and the defaults a browser gives its tag (`strong` bolder, `code` monospace); it hands its text classes to the text nested in it.
 *
 * @param props - See {@link TextProps}.
 * @returns The element.
 */
export function Text(props: TextProps<ElementNode> & ElementRefProps): ReactElement {
  const { as, style, webStyle, children, ref } = props
  const className = useTagClasses(props.className, as)
  const inherited = useInheritedText()
  const split = splitClasses(className, inherited, dataAttributes(props))
  const classes = textElementClasses(split)
  const tagStyle = as === 'strong' ? strongStyle(inherited, className) : TEXT_TAG_STYLE[as]
  const own = nativeStyle(style, webStyle)
  const inheritedFontStyle = useInheritedFontStyle()
  const fontStyle = own?.fontStyle ?? tagStyle?.fontStyle ?? inheritedFontStyle
  const activateLabel = useLabelPress(as === 'label' ? props.htmlFor : undefined, children)
  useLabelText(props.id, children, props['aria-label'])
  const accessibility = nativeAccessibility(props, as)
  const target = useOverlayTarget(
    useNativeRef<NativeText>(ref),
    accessibility.role === 'heading' && !accessibility['aria-hidden'] && children != null
      ? 'heading'
      : undefined,
  )
  return (
    <NativeText
      {...accessibility}
      ref={target.ref}
      className={classes}
      numberOfLines={split.lines ?? undefined}
      ellipsizeMode={split.lines === null ? undefined : 'tail'}
      onPress={activateLabel}
      style={[
        inheritedFontStyle ? { ...tagStyle, fontStyle } : tagStyle,
        own,
        useLineStart(blockInInline(textFlow(props), props.children, true)),
        useGridCell(),
      ]}
    >
      <ElementScope split={split} fontStyle={fontStyle}>
        {children}
      </ElementScope>
    </NativeText>
  )
}

/**
 * How text flows: an inline tag (`span`, `strong`) is inline text, a paragraph or a heading a
 * block, unless its classes say otherwise.
 *
 * @param props - Its props.
 * @returns Its inline kind.
 */
function textFlow(props: { as?: unknown; className?: unknown; webStyle?: unknown }): InlineKind {
  const { webStyle } = props
  if (
    typeof webStyle === 'object' &&
    webStyle &&
    'display' in webStyle &&
    webStyle.display === 'block'
  ) {
    return null
  }
  return flowOf(
    props.className,
    typeof props.as === 'string' && INLINE_TAGS.has(props.as) ? 'text' : null,
    dataAttributes(props),
  )
}

registerInline(Text, textFlow)
