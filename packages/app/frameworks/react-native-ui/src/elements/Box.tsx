/**
 * Box: a container element.
 *
 * @module
 */

import { type ReactElement, useCallback, useContext, useRef } from 'react'
import {
  Image as NativeImage,
  Pressable as NativePressable,
  View,
  type ViewProps,
} from 'react-native'

import type { BoxProps, InlineKind, NativeClassSplit, NativeGridClasses } from '@molecule/app-ui'

import { useDialogAccessibility } from '../platform/focus.js'
import { layoutChanged } from '../platform/layout.js'
import { nativeAccessibility } from './accessibility.js'
import { useImageSource } from './documentUrl.js'
import { dragViewActions, LongPressDragScope, useDragFrame, useNativeDrag } from './drag.js'
import { registerInline } from './flow.js'
import { useGridCell, useGridLayout } from './grid.js'
import {
  blockInInline,
  dataAttributes,
  ElementScope,
  flowOf,
  isCssInline,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useLineStart,
  useTagClasses,
} from './inherited.js'
import { useLabelText, WrappingLabel } from './labels.js'
import { OutsidePressScope, useOutsidePress } from './outsidePress.js'
import { boxPasteOwner, PasteScope } from './paste.js'
import { activatePress, ContextMenuScope, isPressable, pressProps, useMousePress } from './press.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * A container: a `View` with the role its `as` tag implies, or a `Pressable` when it has a press, hover
 * or focus handler or a tab stop (a `div` with `onClick`). Its text classes pass to the text
 * inside it, and in a container that is not a flex container its inline children share lines, as
 * CSS lays them out on the web.
 *
 * @param props - See {@link BoxProps}.
 * @returns The element.
 */
export function Box(props: BoxProps<ElementNode> & ElementRefProps): ReactElement {
  return props.as === 'label' ? (
    <WrappingLabel render={(activateLabel) => <BoxView {...props} activateLabel={activateLabel} />}>
      {props.children}
    </WrappingLabel>
  ) : (
    <BoxView {...props} />
  )
}

/** Draws the box and wires any default label activation after the caller's handler. */
function BoxView(
  props: BoxProps<ElementNode> & ElementRefProps & { activateLabel?: () => void },
): ReactElement {
  const { as, title, className, style, webStyle, children, ref, activateLabel, hidden } = props
  const { coverImage, ...layoutStyle } = style ?? {}
  useLabelText(props.id, children, props['aria-label'])
  const split = splitClasses(
    useTagClasses(className, as),
    useInheritedText(),
    dataAttributes(props),
  )
  const host = useRef<View>(null)
  const forward = useNativeRef<View>(ref)
  const setHost = useCallback(
    (view: View | null) => {
      host.current = view
      forward?.(view)
    },
    [forward],
  )
  const [frame, nativeRef] = useDragFrame(setHost)
  const outside = useOutsidePress(hidden ? undefined : props.onPressOutside, ref ? host : undefined)
  const context = useContext(ContextMenuScope)
  const inheritedPaste = useContext(PasteScope)
  const paste = props.onPasteText && boxPasteOwner(props.onPasteText)
  const dialog = props['aria-modal'] === true || props['aria-modal'] === 'true'
  const dialogAccessibility = useDialogAccessibility({
    ...props,
    'aria-label': props['aria-label'] ?? title,
  })
  const interaction = useMousePress(
    props,
    pressProps(
      as === 'label' ? { ...props, tabIndex: props.tabIndex ?? -1 } : props,
      activateLabel,
    ),
    paste,
    !hidden,
  )
  const secondary = hidden ? undefined : props.secondaryAction
  const inheritedDrag = useContext(LongPressDragScope)
  const ownDrag = hidden ? undefined : props.drag
  const delegatedDrag = !ownDrag && secondary ? inheritedDrag : null
  const responder = useNativeDrag(delegatedDrag?.frame ?? frame, {
    drag: ownDrag ?? delegatedDrag?.drag,
    zoom: hidden ? undefined : props.zoom,
    secondary,
    press: interaction,
  })
  const resolvedStyle = nativeStyle(style && layoutStyle, webStyle)
  const addressFontStyle = as === 'address' ? (resolvedStyle?.fontStyle ?? 'italic') : undefined
  if (as === 'address' && resolvedStyle) delete resolvedStyle.fontStyle
  // Keep the individual cells accessible when the grid owns the gesture.
  const grid = props.role === 'grid' && ownDrag
  const pressable = isPressable(dialog ? { ...props, tabIndex: undefined } : props)
  const accessible =
    hidden || as === 'label' || dialog || grid
      ? false
      : (props.accessibilityGroup ?? (responder && (secondary || pressable) ? true : undefined))
  const view: ViewProps = {
    ...nativeAccessibility({ ...props, 'aria-label': props['aria-label'] ?? title }, as),
    ...dialogAccessibility,
    accessible,
    accessibilityElementsHidden: hidden || undefined,
    importantForAccessibility: hidden ? 'no-hide-descendants' : undefined,
    pointerEvents: hidden ? 'none' : undefined,
    collapsable: ref ? false : undefined,
    onTouchStart: props.onTouchStart
      ? (event) => {
          outside.onTouchStart?.(event)
          props.onTouchStart?.()
        }
      : outside.onTouchStart,
    ...(responder && {
      collapsable: false,
      ...responder,
      ...dragViewActions(
        props,
        interaction,
        interaction.onPress ? () => activatePress(props.onClick, activateLabel) : undefined,
        secondary,
      ),
    }),
    onLayout:
      ref || responder
        ? (event) => {
            responder?.onLayout?.(event)
            if (ref) layoutChanged()
          }
        : undefined,
    className: split.view || undefined,
    style: [
      resolvedStyle,
      useLineStart(boxFlow(props)),
      useGridCell(),
      hidden && { display: 'none' },
    ],
  }
  const press = !responder && (activateLabel || pressable || paste) ? interaction : null
  const longPressScope = ownDrag
    ? ownDrag.touchStart === 'longPress'
      ? { frame, drag: ownDrag }
      : null
    : inheritedDrag
  const background = coverImage ? <CoverImage src={coverImage} /> : null
  return (
    <OutsidePressScope.Provider value={outside.scope}>
      <ContextMenuScope.Provider value={props.onContextMenu ?? context}>
        <PasteScope.Provider value={paste ?? inheritedPaste}>
          <LongPressDragScope.Provider value={longPressScope}>
            <ElementScope split={split} fontStyle={addressFontStyle}>
              {split.grid ? (
                <GridBox
                  view={view}
                  press={press}
                  nativeRef={nativeRef}
                  grid={split.grid}
                  split={split}
                  webStyle={webStyle}
                  background={background}
                >
                  {children}
                </GridBox>
              ) : press ? (
                <NativePressable {...view} ref={nativeRef} {...press} disabled={hidden}>
                  {background}
                  {layoutChildren(children, split)}
                </NativePressable>
              ) : (
                <View {...view} ref={nativeRef}>
                  {background}
                  {layoutChildren(children, split)}
                </View>
              )}
            </ElementScope>
          </LongPressDragScope.Provider>
        </PasteScope.Provider>
      </ContextMenuScope.Provider>
    </OutsidePressScope.Provider>
  )
}

/** Paints the backdrop without participating in the box's layout, interaction or accessible name. */
function CoverImage({ src }: { src: string }): ReactElement | null {
  const uri = useImageSource(src, 'Box coverImage')
  if (!uri) return null
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <NativeImage source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  )
}

/**
 * A Box whose classes make it a CSS grid: its view lays its children out in rows of cells.
 *
 * @param props - The Box's view props, its press handlers, its ref, its grid and split classes, its web
 *   style (a track list, gaps) and its children.
 * @returns The grid's view.
 */
function GridBox({
  view,
  press,
  nativeRef,
  grid,
  split,
  webStyle,
  background,
  children,
}: {
  view: ViewProps
  press: ReturnType<typeof useMousePress> | null
  nativeRef: ReturnType<typeof useNativeRef<View>>
  grid: NativeGridClasses
  split: NativeClassSplit
  webStyle: BoxProps['webStyle']
  background: ReactElement | null
  children: BoxProps<ElementNode>['children']
}): ReactElement {
  const text = split.text
  const layout = useGridLayout({
    grid,
    webStyle,
    text,
    split: (className) => splitClasses(className, text),
    children,
  })
  const style = [view.style, layout.style]
  return press ? (
    <NativePressable
      {...view}
      style={style}
      ref={nativeRef}
      {...press}
      disabled={view.accessibilityElementsHidden}
    >
      {background}
      {layout.rows}
    </NativePressable>
  ) : (
    <View {...view} style={style} ref={nativeRef}>
      {background}
      {layout.rows}
    </View>
  )
}

/**
 * How a box flows: a span is an inline box, any other tag a block, unless its classes say otherwise.
 *
 * @param props - Its props.
 * @returns Its inline kind.
 */
function boxFlow(props: { as?: unknown; className?: unknown; children?: unknown }): InlineKind {
  const data = dataAttributes(props)
  return blockInInline(
    flowOf(props.className, props.as === 'span' || props.as === 'label' ? 'box' : null, data),
    props.children,
    isCssInline(props.className, props.as === 'span' || props.as === 'label', data),
  )
}

registerInline(Box, boxFlow)
