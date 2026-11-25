/**
 * Svg and its shapes.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement, type ReactNode } from 'react'

import type {
  ElementHandle,
  SvgCircleProps,
  SvgClipPathProps,
  SvgDefsProps,
  SvgElementProps,
  SvgEllipseProps,
  SvgGroupProps,
  SvgImageProps,
  SvgLinearGradientProps,
  SvgLineProps,
  SvgMarkupProps,
  SvgMetadata,
  SvgPathProps,
  SvgPatternProps,
  SvgPolyProps,
  SvgProps,
  SvgRectProps,
  SvgTextProps,
} from '@molecule/app-ui'

import { useWebDrag } from './drag.js'
import { useElementRef } from './ref.js'
import type { ElementNode, ShapeNode } from './types.js'

/**
 * An SVG canvas: renders exactly an `<svg>`. On React Native it is react-native-svg's `Svg`.
 *
 * @param props - See {@link SvgProps}.
 * @param ref - The literal SVG viewport.
 * @returns The element.
 */
export const Svg = forwardRef<ElementHandle, SvgProps<ShapeNode>>(function Svg(
  { style, webStyle, drag, metadata, webShapeRendering, children, ...props },
  ref,
): ReactElement {
  return createElement(
    'svg',
    {
      ...props,
      shapeRendering: webShapeRendering,
      ref: useElementRef(ref),
      onPointerDown: useWebDrag<SVGSVGElement>(drag),
      style: style || webStyle ? { ...style, ...webStyle } : undefined,
    },
    ...metadataChildren(metadata),
    children,
  )
})

/**
 * An SVG canvas drawn from inner markup: an `<svg>` holding exactly that markup. On React Native it
 * is react-native-svg's `SvgXml`.
 *
 * @param props - See {@link SvgMarkupProps}.
 * @param ref - The literal SVG viewport.
 * @returns The element.
 */
export const SvgMarkup = forwardRef<ElementHandle, SvgMarkupProps>(function SvgMarkup(
  { style, webStyle, webShapeRendering, markup, ...props },
  ref,
): ReactElement {
  return createElement('svg', {
    ...props,
    shapeRendering: webShapeRendering,
    ref: useElementRef(ref),
    style: style || webStyle ? { ...style, ...webStyle } : undefined,
    dangerouslySetInnerHTML: { __html: markup },
  })
})

/** Applies the CSS escape hatch without introducing an extra node or attribute. */
function shape<P extends SvgElementProps>(
  tag: string,
  { style, webStyle, ...props }: P,
  ...children: ReactNode[]
): ReactElement {
  return createElement(
    tag,
    { ...props, style: style || webStyle ? { ...style, ...webStyle } : undefined },
    ...children,
  )
}

/** Emits descriptive children first, only when supplied by the owner. */
function metadataChildren(metadata: SvgMetadata | undefined): ReactElement[] {
  const children: ReactElement[] = []
  if (metadata?.title !== undefined) children.push(createElement('title', null, metadata.title))
  const description = metadata?.description
  if (description) children.push(createElement('desc', { id: description.id }, description.text))
  return children
}

/**
 * An SVG `<path>`.
 *
 * @param props - See {@link SvgPathProps}.
 * @returns The element.
 */
export function Path(props: SvgPathProps): ReactElement {
  return shape('path', props)
}

/**
 * An SVG `<rect>`.
 *
 * @param props - See {@link SvgRectProps}.
 * @returns The element.
 */
export function Rect({ metadata, ...props }: SvgRectProps): ReactElement {
  return shape('rect', props, ...metadataChildren(metadata))
}

/**
 * An SVG `<circle>`.
 *
 * @param props - See {@link SvgCircleProps}.
 * @returns The element.
 */
export function Circle(props: SvgCircleProps): ReactElement {
  return shape('circle', props)
}

/**
 * An SVG `<ellipse>`.
 *
 * @param props - See {@link SvgEllipseProps}.
 * @returns The element.
 */
export function Ellipse(props: SvgEllipseProps): ReactElement {
  return shape('ellipse', props)
}

/**
 * An SVG `<line>`.
 *
 * @param props - See {@link SvgLineProps}.
 * @returns The element.
 */
export function Line(props: SvgLineProps): ReactElement {
  return shape('line', props)
}

/**
 * An SVG `<polyline>`.
 *
 * @param props - See {@link SvgPolyProps}.
 * @returns The element.
 */
export function Polyline(props: SvgPolyProps): ReactElement {
  return shape('polyline', props)
}

/**
 * An SVG `<polygon>`.
 *
 * @param props - See {@link SvgPolyProps}.
 * @returns The element.
 */
export function Polygon(props: SvgPolyProps): ReactElement {
  return shape('polygon', props)
}

/**
 * An SVG group, `<g>`.
 *
 * @param props - See {@link SvgGroupProps}.
 * @returns The element.
 */
export function G({ drag, ...props }: SvgGroupProps<ShapeNode>): ReactElement {
  const onPointerDown = useWebDrag<SVGGElement>(drag)
  return shape('g', { ...props, onPointerDown })
}

/**
 * SVG `<text>`.
 *
 * @param props - See {@link SvgTextProps}.
 * @returns The element.
 */
export function SvgText(props: SvgTextProps<ElementNode>): ReactElement {
  return shape('text', props)
}

/**
 * An SVG `<defs>` containing named drawing definitions.
 *
 * @param props - See {@link SvgDefsProps}.
 * @returns The element.
 */
export function SvgDefs(props: SvgDefsProps<ShapeNode>): ReactElement {
  return createElement('defs', props)
}

/**
 * An SVG `<clipPath>` containing geometry for a local clipping reference.
 *
 * @param props - See {@link SvgClipPathProps}.
 * @returns The element.
 */
export function SvgClipPath(props: SvgClipPathProps<ShapeNode>): ReactElement {
  return createElement('clipPath', props)
}

/**
 * An SVG `<linearGradient>` with literal stops in input order.
 *
 * @param props - See {@link SvgLinearGradientProps}.
 * @returns The element.
 */
export function SvgLinearGradient({ stops, ...props }: SvgLinearGradientProps): ReactElement {
  return createElement('linearGradient', props, ...stops.map((stop) => createElement('stop', stop)))
}

/**
 * An SVG `<pattern>` whose children draw a repeating tile.
 *
 * @param props - See {@link SvgPatternProps}.
 * @returns The element.
 */
export function SvgPattern(props: SvgPatternProps<ShapeNode>): ReactElement {
  return createElement('pattern', props)
}

/**
 * An SVG `<image>` positioned in the drawing's coordinate system.
 *
 * @param props - See {@link SvgImageProps}.
 * @returns The element.
 */
export function SvgImage(props: SvgImageProps): ReactElement {
  return shape('image', props)
}
