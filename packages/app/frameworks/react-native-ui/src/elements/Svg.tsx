/**
 * Svg and its shapes.
 *
 * @module
 */

import {
  createContext,
  forwardRef,
  isValidElement,
  type ReactElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import {
  type LayoutChangeEvent,
  type LayoutRectangle,
  Platform,
  Pressable,
  processColor,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import {
  Circle as NativeCircle,
  ClipPath as NativeClipPath,
  Defs as NativeDefs,
  Ellipse as NativeEllipse,
  G as NativeG,
  Image as NativeImage,
  Line as NativeLine,
  LinearGradient as NativeLinearGradient,
  Path as NativePath,
  Pattern as NativePattern,
  Polygon as NativePolygon,
  Polyline as NativePolyline,
  Rect as NativeRect,
  Stop as NativeStop,
  Svg as NativeSvg,
  type SvgProps as NativeSvgProps,
  SvgXml,
  Text as NativeSvgText,
} from 'react-native-svg'

import { type FontRole, getFont } from '@molecule/app-fonts'
import {
  type ElementHandle,
  getClassMap,
  type SvgCircleProps,
  type SvgClipPathProps,
  type SvgDefsProps,
  type SvgElementProps,
  type SvgEllipseProps,
  type SvgGroupProps,
  type SvgImageProps,
  type SvgLinearGradientProps,
  type SvgLineProps,
  type SvgMarkupProps,
  type SvgMetadata,
  type SvgPathProps,
  type SvgPatternProps,
  type SvgPolyProps,
  type SvgProps,
  type SvgRectProps,
  type SvgStyle,
  type SvgTextProps,
} from '@molecule/app-ui'

import { type NativeAccessibility, nativeAccessibility } from './accessibility.js'
import { useImageSource } from './documentUrl.js'
import { SvgDragFrame, useNativeDrag } from './drag.js'
import { keyboardEvent, mouseEvent } from './events.js'
import { registerInline } from './flow.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  replacedFlow,
  splitClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { useLabelText, useReferencedLabelText } from './labels.js'
import { useOutsideTouch } from './outsidePress.js'
import { getNativeKeyboardView, rangeKeyboardEvent } from './rangeKeyboard.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import { SvgHoverScope, useRectHover, useSvgHover } from './svgHover.js'
import type { ElementNode, ElementRefProps, ShapeNode } from './types.js'

/**
 * An SVG canvas: react-native-svg's `Svg`. Its classes and the text classes its container hands
 * down go to `className`, so a class-name runtime can resolve the text colour `currentColor` reads.
 *
 * @param props - See {@link SvgProps}.
 * @param ref - The native canvas viewport.
 * @returns The element.
 */
export const Svg = forwardRef<ElementHandle, SvgProps<ShapeNode>>(
  function Svg(props, ref): ReactElement {
    return <Canvas {...props} elementRef={ref} />
  },
)

/** Draws the canvas and hosts its focus layer in the same coordinate space. */
function Canvas(
  props: SvgProps<ShapeNode> & { elementRef: ElementRefProps['ref']; markup?: string },
): ReactElement {
  const canvas = useCanvasProps(props)
  const forward = useNativeRef<View>(props.elementRef)
  const hover = useSvgHover(props)
  const hoverHost = hover.host
  const responder = useNativeDrag(hoverHost, {
    drag: props.style?.pointerEvents === 'none' ? undefined : props.drag,
    press: { onPress: canvas.props.onPress },
  })
  const ref = useCallback(
    (view: View | null): void => {
      hoverHost.current = view
      forward?.(view)
    },
    [forward, hoverHost],
  )
  const [targets, setTargets] = useState<ReadonlyMap<string, FocusTarget>>(() => new Map())
  const [register] = useState<RegisterFocusTarget>(() => (id: string, target: FocusTarget) => {
    setTargets((previous) => new Map(previous).set(id, target))
    return () => {
      setTargets((previous) => {
        const next = new Map(previous)
        next.delete(id)
        return next
      })
    }
  })
  const rootFocusable = needsFocusTarget(props)
  const onTouchStart = useOutsideTouch(hoverHost)
  const hidden = canvas.props['aria-hidden']
  const drawing: NativeSvgProps = {
    ...canvas.props,
    onPress: responder ? undefined : canvas.props.onPress,
    focusable: false,
    accessible: rootFocusable ? false : canvas.props.accessible,
  }
  const { markup, children } = props
  const renderDrawing = (color: string | undefined): ReactElement => {
    const ink =
      typeof color === 'string' && typeof processColor(color) === 'number' ? color : undefined
    return (
      <SvgInk.Provider value={ink}>
        <NativeSvg {...drawing} color={ink}>
          {children}
        </NativeSvg>
      </SvgInk.Provider>
    )
  }
  const textClasses = drawing.className
  const styledDrawing =
    markup === undefined && textClasses
      ? getClassMap().renderNativeTextColor?.(textClasses, renderDrawing)
      : undefined
  const content =
    markup === undefined ? (
      isValidElement(styledDrawing) ? (
        styledDrawing
      ) : (
        renderDrawing(undefined)
      )
    ) : (
      <SvgXml {...drawing} xml={`<svg>${markup}</svg>`} />
    )
  return (
    <View
      ref={ref}
      collapsable={false}
      onTouchStart={onTouchStart}
      pointerEvents={responder ? 'auto' : 'box-none'}
      {...hover.handlers}
      {...responder}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : undefined}
      style={canvas.frameStyle}
      className={canvas.frameClassName}
    >
      <SvgDragFrame.Provider value={hoverHost}>
        <SvgFocusScope.Provider value={hidden ? null : register}>
          <SvgHoverScope.Provider value={hover.register}>{content}</SvgHoverScope.Provider>
        </SvgFocusScope.Provider>
      </SvgDragFrame.Provider>
      {rootFocusable && <SvgFocusTarget target={focusTarget(props, canvas.accessibility)} fill />}
      {!hidden &&
        Array.from(targets, ([id, target]) => <SvgFocusTarget key={id} target={target} />)}
    </View>
  )
}

/**
 * The react-native-svg props of a canvas: its size, view box and paint, its classes (the text
 * classes in effect, so `currentColor` is the text colour), its style and its accessibility.
 *
 * @param props - The canvas's props.
 * @returns The react-native-svg props.
 */
function useCanvasProps(props: Omit<SvgProps, 'children'>): {
  props: NativeSvgProps
  accessibility: NativeAccessibility
  frameStyle: Array<ViewStyle | undefined>
  frameClassName: string | undefined
} {
  const {
    viewBox,
    preserveAspectRatio,
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    strokeOpacity,
    strokeLinecap,
    strokeLinejoin,
    strokeDasharray,
    strokeDashoffset,
    opacity,
    transform,
    style,
  } = props
  const accessibility = useSvgAccessibility(props, props.metadata)
  const split = splitClasses(
    useTagClasses(props.className, 'svg'),
    useInheritedText(),
    dataAttributes(props),
  )
  const {
    width,
    height,
    style: measuredStyle,
  } = canvasSize(props.width, props.height, split.sized, viewBox)
  const cell = useGridCell()
  const frameStyle: Array<ViewStyle | undefined> = [
    measuredStyle,
    width === undefined ? undefined : { width },
    height === undefined ? undefined : { height },
    nativeStyle(undefined, props.webStyle),
    cell,
  ]
  // Percentage dimensions on a view-box-only drawing give its auto-sized frame a
  // 300px intrinsic width on web, even in a flex slot that would shrink to zero.
  const hasFrameDimension =
    split.sized?.width ||
    split.sized?.height ||
    frameStyle.some((style) => style?.width !== undefined || style?.height !== undefined)
  return {
    accessibility,
    frameStyle,
    frameClassName: split.view || undefined,
    props: {
      ...accessibility,
      ...(hasFrameDimension ? { width: '100%', height: '100%' } : {}),
      accessibilityLabel: accessibility['aria-label'],
      accessible:
        !accessibility['aria-hidden'] &&
        Boolean(
          accessibility['aria-label'] || accessibility.accessibilityHint || accessibility.role,
        ),
      accessibilityRole: accessibility.role === 'img' ? 'image' : undefined,
      className: split.text || undefined,
      viewBox,
      preserveAspectRatio,
      fill,
      fillOpacity,
      stroke,
      strokeWidth,
      strokeOpacity,
      strokeLinecap,
      strokeLinejoin,
      strokeDasharray,
      strokeDashoffset,
      opacity,
      transform,
      ...style,
      onPress:
        props.onClick && style?.pointerEvents !== 'none'
          ? (event) => props.onClick?.(mouseEvent(event))
          : undefined,
    },
  }
}

registerInline(Svg, (props) => replacedFlow(props.className, 'svg'))

/** The size the web gives a drawing with no width, no height and no view box. */
const DEFAULT_CANVAS = { width: 300, height: 150 } as const

/**
 * The width/height ratio of a view box (`0 0 24 12` is 2), or `null` without a usable one.
 *
 * @param viewBox - The view box.
 * @returns The ratio.
 */
export function viewBoxRatio(viewBox: string | undefined): number | null {
  const parts = (viewBox ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const [, , w, h] = parts
  return parts.length === 4 && w !== undefined && h !== undefined && w > 0 && h > 0 ? w / h : null
}

/**
 * A drawing's size as the web sizes an `<svg>`: its classes take precedence over the width and
 * height attributes. A view box gives auto-sized dimensions an aspect ratio, with the available
 * space determined by layout. Without a view box, missing dimensions default to 300px by 150px.
 *
 * @param width - The `width` attribute.
 * @param height - The `height` attribute.
 * @param sized - Which sizes the classes set.
 * @param viewBox - The view box.
 * @returns The props' width and height, and the style that supplies the sizes neither sets.
 */
export function canvasSize(
  width: SvgProps['width'],
  height: SvgProps['height'],
  sized: { width: boolean; height: boolean } | undefined,
  viewBox: string | undefined,
): {
  width: SvgProps['width']
  height: SvgProps['height']
  style: { aspectRatio?: number; width?: number; height?: number } | undefined
} {
  const ownWidth = sized?.width ? undefined : width
  const ownHeight = sized?.height ? undefined : height
  const hasWidth = ownWidth !== undefined || sized?.width === true
  const hasHeight = ownHeight !== undefined || sized?.height === true
  if (hasWidth && hasHeight) return { width: ownWidth, height: ownHeight, style: undefined }
  const ratio = viewBoxRatio(viewBox)
  const style = ratio
    ? { aspectRatio: ratio }
    : {
        ...(hasWidth ? {} : { width: DEFAULT_CANVAS.width }),
        ...(hasHeight ? {} : { height: DEFAULT_CANVAS.height }),
      }
  return { width: ownWidth, height: ownHeight, style }
}

/**
 * A canvas drawn from inner SVG markup: react-native-svg's `SvgXml` with that markup, sized and
 * painted as {@link Svg} is.
 *
 * @param props - See {@link SvgMarkupProps}.
 * @param ref - The native canvas viewport.
 * @returns The element.
 */
export const SvgMarkup = forwardRef<ElementHandle, SvgMarkupProps>(
  function SvgMarkup(props, ref): ReactElement {
    return <Canvas {...props} elementRef={ref} />
  },
)

registerInline(SvgMarkup, (props) => replacedFlow(props.className, 'svg'))

type FocusTarget = Pick<SvgElementProps, 'tabIndex' | 'onClick' | 'onKeyDown'> & {
  accessibility: NativeAccessibility
  bounds?: LayoutRectangle
}
type RegisterFocusTarget = (id: string, target: FocusTarget) => () => void

const SvgFocusScope = createContext<RegisterFocusTarget | null>(null)

/** Concrete ink used both by the native canvas and by its gradient stops. */
const SvgInk = createContext<string | undefined>(undefined)

/** Structured metadata and ARIA relationships share the native kit's existing ID directory. */
function useSvgAccessibility(
  props: SvgElementProps,
  metadata?: SvgMetadata,
  text?: string,
): NativeAccessibility {
  const description = metadata?.description
  const fallbackName = props['aria-label'] ?? metadata?.title ?? text
  useLabelText(props.id, fallbackName)
  useLabelText(description?.id, description?.text)
  const name = useReferencedLabelText(props['aria-labelledby']) ?? fallbackName
  const hint = useReferencedLabelText(props['aria-describedby']) ?? description?.text
  return useMemo(() => {
    const accessibility = nativeAccessibility({ ...props, 'aria-label': name })
    const hints = [hint, accessibility.accessibilityHint].filter(Boolean)
    return { ...accessibility, accessibilityHint: hints.join(', ') || undefined }
  }, [props, name, hint])
}

/** The native SVG shapes omit roles and keyboard targets. The canvas publishes those separately. */
function needsFocusTarget(props: SvgElementProps, shape = false, metadata?: SvgMetadata): boolean {
  const hidden = props['aria-hidden']
  return (
    hidden !== true &&
    hidden !== 'true' &&
    Boolean(
      props.onKeyDown ||
      (props.tabIndex !== undefined && props.tabIndex >= 0) ||
      (shape &&
        (metadata ||
          props['aria-labelledby'] ||
          props['aria-describedby'] ||
          (props.role && props.role !== 'none' && props.role !== 'presentation'))),
    )
  )
}

/** Focus properties for the canvas itself. */
function focusTarget(props: SvgElementProps, accessibility: NativeAccessibility): FocusTarget {
  return {
    accessibility,
    tabIndex: props.tabIndex,
    onClick: props.onClick,
    onKeyDown: props.onKeyDown,
  }
}

/** A focus and accessibility target that leaves touch hit-testing to the drawing. */
function SvgFocusTarget({ target, fill }: { target: FocusTarget; fill?: boolean }): ReactElement {
  const { accessibility, tabIndex, onClick, onKeyDown, bounds } = target
  const KeyboardView = useMemo(getNativeKeyboardView, [])
  const focusable = tabIndex !== undefined ? tabIndex >= 0 : Boolean(onKeyDown)
  const style: ViewStyle = bounds
    ? {
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }
    : fill
      ? { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }
      : { position: 'absolute', top: 0, left: 0, width: 1, height: 1 }
  const invoke = (): void => {
    if (onClick) onClick(mouseEvent(undefined))
    else onKeyDown?.(keyboardEvent('Enter'))
  }
  const control: ViewProps = {
    ...accessibility,
    testID: accessibility.testID ? `${accessibility.testID}-focus` : undefined,
    accessible: true,
    focusable,
    pointerEvents: 'box-none',
    style,
    onAccessibilityTap: onClick || onKeyDown ? invoke : undefined,
    accessibilityActions: onClick || onKeyDown ? [{ name: 'activate' }] : undefined,
    onAccessibilityAction: (event) => {
      if (event.nativeEvent.actionName === 'activate') invoke()
    },
  }
  if (onKeyDown && KeyboardView) {
    return (
      <KeyboardView
        {...control}
        canBeFocused={focusable}
        hasKeyDownPress
        onKeyDownPress={(event) => {
          const { keyCode } = event.nativeEvent
          const ios = Platform.OS === 'ios'
          const enter = ios ? keyCode === 40 || keyCode === 88 : keyCode === 66 || keyCode === 160
          const space = keyCode === (ios ? 44 : 62)
          const key = rangeKeyboardEvent(event)
          if (enter) Object.assign(key, { key: 'Enter', code: 'Enter' })
          if (space) Object.assign(key, { key: ' ', code: 'Space' })
          onKeyDown(key)
        }}
      />
    )
  }
  return (
    <Pressable
      {...control}
      onPress={onKeyDown ? () => onKeyDown(keyboardEvent('Enter')) : undefined}
    />
  )
}

type NativeShape<P> = Omit<
  P,
  'className' | 'role' | 'webStyle' | 'style' | 'tabIndex' | 'onClick' | 'onKeyDown'
> &
  SvgStyle & {
    accessible?: boolean
    accessibilityLabel?: string
    testID?: string
    onPress?: NativeSvgProps['onPress']
    onLayout?: (event: LayoutChangeEvent) => void
  }

/** Copies typed paint and adapts a shape's native touch and accessibility props. */
function useShape<P extends SvgElementProps>(
  props: P,
  options?: { metadata?: SvgMetadata; label?: string; pointerEvents?: SvgStyle['pointerEvents'] },
): NativeShape<P> {
  const {
    className: _className,
    role: _role,
    webStyle: _webStyle,
    style,
    tabIndex,
    onClick,
    onKeyDown,
    ...paint
  } = props
  const register = useContext(SvgFocusScope)
  const id = useId()
  const [bounds, setBounds] = useState<LayoutRectangle>()
  const proxy = register !== null && needsFocusTarget(props, true, options?.metadata)
  const accessibility = useSvgAccessibility(props, options?.metadata, options?.label)
  const pointerEvents = style?.pointerEvents ?? options?.pointerEvents
  const name = accessibility['aria-label']
  const { testID } = accessibility
  useLayoutEffect(() => {
    if (!proxy || !register) return
    return register(id, { accessibility, tabIndex, onClick, onKeyDown, bounds })
  }, [proxy, register, id, accessibility, tabIndex, onClick, onKeyDown, bounds])
  return {
    ...paint,
    ...style,
    pointerEvents,
    accessible: proxy || accessibility['aria-hidden'] ? false : name ? true : undefined,
    accessibilityLabel: accessibility['aria-hidden'] ? undefined : name,
    testID,
    onPress:
      onClick && pointerEvents !== 'none'
        ? (event: Parameters<NonNullable<NativeSvgProps['onPress']>>[0]) =>
            onClick(mouseEvent(event))
        : undefined,
    onLayout: proxy
      ? ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
          setBounds((previous) =>
            previous?.x === layout.x &&
            previous.y === layout.y &&
            previous.width === layout.width &&
            previous.height === layout.height
              ? previous
              : layout,
          )
        }
      : undefined,
  }
}

/**
 * An SVG path.
 *
 * @param props - See {@link SvgPathProps}.
 * @returns The element.
 */
export function Path(props: SvgPathProps): ReactElement {
  return <NativePath {...useShape(props)} />
}

/**
 * An SVG rectangle.
 *
 * @param props - See {@link SvgRectProps}.
 * @returns The element.
 */
export function Rect(props: SvgRectProps): ReactElement {
  const { metadata, onMouseEnter: _onMouseEnter, pointerEvents, ...paint } = props
  const ref = useRectHover(props)
  return <NativeRect {...useShape(paint, { metadata, pointerEvents })} ref={ref} />
}

/**
 * An SVG circle.
 *
 * @param props - See {@link SvgCircleProps}.
 * @returns The element.
 */
export function Circle(props: SvgCircleProps): ReactElement {
  return <NativeCircle {...useShape(props)} />
}

/**
 * An SVG ellipse.
 *
 * @param props - See {@link SvgEllipseProps}.
 * @returns The element.
 */
export function Ellipse(props: SvgEllipseProps): ReactElement {
  return <NativeEllipse {...useShape(props)} />
}

/**
 * An SVG line.
 *
 * @param props - See {@link SvgLineProps}.
 * @returns The element.
 */
export function Line(props: SvgLineProps): ReactElement {
  return <NativeLine {...useShape(props)} />
}

/**
 * An SVG polyline.
 *
 * @param props - See {@link SvgPolyProps}.
 * @returns The element.
 */
export function Polyline(props: SvgPolyProps): ReactElement {
  return <NativePolyline {...useShape(props)} />
}

/**
 * An SVG polygon.
 *
 * @param props - See {@link SvgPolyProps}.
 * @returns The element.
 */
export function Polygon(props: SvgPolyProps): ReactElement {
  return <NativePolygon {...useShape(props)} />
}

/**
 * An SVG group.
 *
 * @param props - See {@link SvgGroupProps}.
 * @returns The element.
 */
export function G({ drag, ...props }: SvgGroupProps<ShapeNode>): ReactElement {
  const frame = useContext(SvgDragFrame)
  const shape = useShape(props)
  const responder = useNativeDrag(frame, {
    drag: props.style?.pointerEvents === 'none' ? undefined : drag,
    press: { onPress: shape.onPress },
  })
  return (
    <NativeG
      {...shape}
      {...responder}
      onPress={responder ? undefined : shape.onPress}
      onLayout={
        shape.onLayout || responder?.onLayout
          ? (event: LayoutChangeEvent) => {
              shape.onLayout?.(event)
              responder?.onLayout?.(event)
            }
          : undefined
      }
    />
  )
}

/**
 * SVG text.
 *
 * @param props - See {@link SvgTextProps}.
 * @returns The element.
 */
export function SvgText(props: SvgTextProps<ElementNode>): ReactElement {
  const { children, fontFamily, ...text } = props
  const label =
    typeof children === 'string' || typeof children === 'number' ? String(children) : undefined
  const { dominantBaseline, ...shape } = useShape({ ...text, children }, { label })
  return (
    <NativeSvgText
      {...shape}
      alignmentBaseline={dominantBaseline === 'auto' ? undefined : dominantBaseline}
      fontFamily={nativeFontFamily(fontFamily)}
    />
  )
}

const FONT_ROLES: readonly FontRole[] = ['sans', 'serif', 'mono', 'icon']
const IOS_FAMILIES: readonly string[] = [
  'Arial',
  'Courier New',
  'Georgia',
  'Helvetica',
  'Helvetica Neue',
  'Menlo',
  'Times New Roman',
]
const ANDROID_FAMILIES: readonly string[] = [
  'Roboto',
  'Roboto Condensed',
  'sans-serif',
  'sans-serif-condensed',
  'serif',
  'monospace',
]

/** Finds the first registered or system family in CSS priority order. */
function nativeFontFamily(list: string | undefined): string | undefined {
  const entries = list?.matchAll(/(?:^|,)\s*(?:"([^"]*)"|'([^']*)'|([^,]+))/g)
  if (!entries) return undefined
  const fonts = FONT_ROLES.map(getFont)
  const system = Platform.OS === 'android' ? ANDROID_FAMILIES : IOS_FAMILIES
  for (const [, doubleQuoted, singleQuoted, unquoted] of entries) {
    const family = (doubleQuoted ?? singleQuoted ?? unquoted)?.trim()
    if (!family) continue
    const name = family.toLowerCase()
    if (name === 'system-ui' || name === '-apple-system' || name === 'blinkmacsystemfont')
      return undefined
    if (name === 'sans-serif') return Platform.OS === 'android' ? 'sans-serif' : undefined
    if (name === 'monospace') return Platform.OS === 'android' ? 'monospace' : 'Menlo'
    if (name === 'serif') return Platform.OS === 'android' ? 'serif' : 'Georgia'
    const available = system.find((item) => item.toLowerCase() === name)
    if (available) return available
    for (const font of fonts) {
      if (!font?.nativeFiles) continue
      const loaded = Object.keys(font.nativeFiles).find((item) => item.toLowerCase() === name)
      if (loaded) return loaded
      if (font.family.toLowerCase() === name) return font.family
    }
  }
  return undefined
}

/** Definitions draw geometry but don't register as canvas interaction targets. */
function DefinitionShapes({ children }: SvgDefsProps<ShapeNode>): ReactElement {
  return (
    <SvgFocusScope.Provider value={null}>
      <SvgHoverScope.Provider value={null}>{children}</SvgHoverScope.Provider>
    </SvgFocusScope.Provider>
  )
}

/**
 * Native SVG definitions in the enclosing drawing's ID namespace.
 *
 * @param props - See {@link SvgDefsProps}.
 * @returns The native definitions.
 */
export function SvgDefs({ children }: SvgDefsProps<ShapeNode>): ReactElement {
  return (
    <NativeDefs>
      <DefinitionShapes>{children}</DefinitionShapes>
    </NativeDefs>
  )
}

/**
 * A native SVG clipping region.
 *
 * @param props - See {@link SvgClipPathProps}.
 * @returns The native clipping region.
 */
export function SvgClipPath({ children, ...props }: SvgClipPathProps<ShapeNode>): ReactElement {
  return (
    <NativeClipPath {...props}>
      <DefinitionShapes>{children}</DefinitionShapes>
    </NativeClipPath>
  )
}

/**
 * A native linear gradient with concrete colours and ordered stops.
 *
 * @param props - See {@link SvgLinearGradientProps}.
 * @returns The native gradient.
 */
export function SvgLinearGradient({ stops, ...props }: SvgLinearGradientProps): ReactElement {
  const inherited = useContext(SvgInk)
  const ink = inherited ?? (Platform.OS === 'web' ? 'currentColor' : '#000')
  return (
    <NativeLinearGradient {...props}>
      {stops.map(({ offset, stopColor, stopOpacity }, index) => (
        <NativeStop
          key={index}
          offset={offset}
          stopColor={stopColor === 'currentColor' ? ink : stopColor}
          stopOpacity={stopOpacity}
        />
      ))}
    </NativeLinearGradient>
  )
}

/**
 * A named SVG pattern, repeated by the device's SVG painter.
 *
 * @param props - See {@link SvgPatternProps}.
 * @returns The native pattern.
 */
export function SvgPattern({ children, ...props }: SvgPatternProps<ShapeNode>): ReactElement {
  return (
    <NativePattern {...props}>
      <DefinitionShapes>{children}</DefinitionShapes>
    </NativePattern>
  )
}

/**
 * A native image positioned in SVG user space.
 *
 * @param props - See {@link SvgImageProps}.
 * @returns The native image.
 */
export function SvgImage({ href, ...props }: SvgImageProps): ReactElement {
  return <NativeImage {...useShape(props)} href={useImageSource(href, 'SVG image href')} />
}
