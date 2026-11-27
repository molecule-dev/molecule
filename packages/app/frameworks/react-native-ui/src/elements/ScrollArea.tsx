/**
 * ScrollArea: a container that scrolls.
 *
 * @module
 */

import {
  createContext,
  type ReactElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  I18nManager,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  View,
} from 'react-native'

import type { ElementHandle, ScrollAreaProps, ScrollOffset } from '@molecule/app-ui'

import { useDialogAccessibility } from '../platform/focus.js'
import { layoutChanged, ScrollViewportScope } from '../platform/layout.js'
import { nativeAccessibility } from './accessibility.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  ElementScope,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { useNativeRef } from './ref.js'
import { ScrollRevealScope, useScrollReveal } from './scrollReveal.js'
import { nativeStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/** The scroll view fills its frame and is bounded by it, so the frame's size limits scroll. */
const FILL = { flexGrow: 1, flexShrink: 1 } as const

/** The viewport available to a horizontal scroll area's content, once measured. */
export const HorizontalViewport = createContext<{ width?: number } | null>(null)

/**
 * A scrolling container: a native `View` frame with the element's classes, role and ref, holding
 * a `ScrollView` in `direction` that the frame's size bounds.
 *
 * @param props - See {@link ScrollAreaProps}.
 * @returns The element.
 */
export function ScrollArea(props: ScrollAreaProps<ElementNode> & ElementRefProps): ReactElement {
  const { as, direction, className, style, webStyle, children, ref, tabIndex, onScroll } = props
  const split = splitClasses(
    useTagClasses(className, as ?? 'div'),
    useInheritedText(),
    dataAttributes(props),
  )
  const text = split.text
  const both = direction === 'both'
  const horizontal = both || direction === 'horizontal'
  const outer = useScrollReveal(horizontal)
  const inner = useScrollReveal(false)
  const { reveal: revealOuter } = outer
  const { reveal: revealInner } = inner
  const [viewport, setViewport] = useState<LayoutRectangle>()
  const offset = useRef<ScrollOffset>({ x: 0, y: 0 })
  const frame = useRef<View>(null)
  const forward = useNativeRef<View>(ref)
  const setFrame = useCallback(
    (view: View | null) => {
      frame.current = view
      forward?.(view)
    },
    [forward],
  )
  const parent = useContext(ScrollViewportScope)
  const scrollViewport = useMemo(() => ({ target: frame, parent }), [parent])
  const reveal = useCallback(
    (element: ElementHandle) => {
      revealOuter(element)
      if (both) revealInner(element)
    },
    [both, revealInner, revealOuter],
  )

  /** Updates positioned surfaces and reports the current scroll offset. */
  function publish(event: NativeSyntheticEvent<NativeScrollEvent>, xAxis: boolean): void {
    layoutChanged()
    if (!onScroll) return
    const position = physicalOffset(event.nativeEvent)
    const previous = offset.current
    const next = {
      x: xAxis ? position.x : both ? previous.x : 0,
      y: xAxis ? (both ? previous.y : 0) : position.y,
    }
    if (previous.x === next.x && previous.y === next.y) return
    offset.current = next
    onScroll(next)
  }

  const dialog = props['aria-modal'] === true || props['aria-modal'] === 'true'
  const dialogAccessibility = useDialogAccessibility(props)
  const content = (
    <HorizontalViewport.Provider value={horizontal ? { width: viewport?.width } : null}>
      <ScrollRevealScope.Provider value={reveal}>
        <ScrollViewportScope.Provider value={scrollViewport}>
          {layoutChildren(children, split)}
        </ScrollViewportScope.Provider>
      </ScrollRevealScope.Provider>
    </HorizontalViewport.Provider>
  )
  return (
    <ElementScope split={split} text={text}>
      <View
        {...nativeAccessibility(props, as)}
        {...dialogAccessibility}
        ref={setFrame}
        collapsable={false}
        tabIndex={tabIndex === undefined ? undefined : tabIndex < 0 ? -1 : 0}
        className={split.view || undefined}
        style={[
          { flexShrink: 1 },
          dialog && { height: '100%' },
          nativeStyle(style, webStyle),
          useGridCell(),
        ]}
      >
        <ScrollView
          ref={outer.ref}
          onScroll={(event) => {
            outer.onScroll(event)
            publish(event, horizontal)
          }}
          scrollEventThrottle={16}
          horizontal={horizontal}
          nestedScrollEnabled={both || undefined}
          showsVerticalScrollIndicator={both ? false : undefined}
          style={FILL}
          // A handled tap, including a suggestion press, reaches its control on the first tap.
          keyboardShouldPersistTaps="handled"
          onLayout={horizontal ? (event) => setViewport(event.nativeEvent.layout) : undefined}
        >
          {both ? (
            <ScrollView
              ref={inner.ref}
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              // Bound the vertical viewport while allowing its content to size the horizontal axis.
              style={{ height: viewport?.height ?? '100%', minWidth: viewport?.width }}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              onScroll={(event) => {
                inner.onScroll(event)
                publish(event, false)
              }}
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </ScrollView>
      </View>
    </ElementScope>
  )
}

/** RN dispatches physical x on Android and also flips the iOS RTL offset before dispatch. */
function physicalOffset({
  contentInset,
  contentOffset,
  contentSize,
  layoutMeasurement,
}: NativeScrollEvent): ScrollOffset {
  // The mirrored UIScrollView's right inset lands on the physical left.
  const left = Platform.OS === 'ios' && I18nManager.isRTL ? contentInset.right : contentInset.left
  return {
    x: clampOffset(contentOffset.x + left, contentSize.width - layoutMeasurement.width),
    y: clampOffset(
      contentOffset.y + contentInset.top,
      contentSize.height - layoutMeasurement.height,
    ),
  }
}

/** Clamps platform overscroll to the content's physical extent. */
function clampOffset(value: number, extent: number): number {
  return Math.min(Math.max(0, extent), Math.max(0, value))
}
