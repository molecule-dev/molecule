/**
 * Svg and its shapes.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type {
  SvgCircleProps,
  SvgElementProps,
  SvgEllipseProps,
  SvgGroupProps,
  SvgLineProps,
  SvgMarkupProps,
  SvgPathProps,
  SvgPolyProps,
  SvgProps,
  SvgRectProps,
  SvgTextProps,
} from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import type { ElementNode, ElementRefProps, ShapeNode } from './types.js'

/**
 * An SVG canvas: renders exactly an `<svg>`. On React Native it is react-native-svg's `Svg`.
 *
 * @param props - See {@link SvgProps}.
 * @returns The element.
 */
export function Svg({
  ref,
  style,
  webStyle,
  ...props
}: SvgProps<ShapeNode> & ElementRefProps): ReactElement {
  return createElement('svg', {
    ...props,
    ref: useElementRef(ref),
    style: style || webStyle ? { ...style, ...webStyle } : undefined,
  })
}

/**
 * An SVG canvas drawn from inner markup: an `<svg>` holding exactly that markup. On React Native it
 * is react-native-svg's `SvgXml`.
 *
 * @param props - See {@link SvgMarkupProps}.
 * @returns The element.
 */
export function SvgMarkup({
  ref,
  style,
  webStyle,
  markup,
  ...props
}: SvgMarkupProps & ElementRefProps): ReactElement {
  return createElement('svg', {
    ...props,
    ref: useElementRef(ref),
    style: style || webStyle ? { ...style, ...webStyle } : undefined,
    dangerouslySetInnerHTML: { __html: markup },
  })
}

/** Applies the CSS escape hatch without introducing an extra node or attribute. */
function shape<P extends SvgElementProps>(
  tag: string,
  { style, webStyle, ...props }: P,
): ReactElement {
  return createElement(tag, {
    ...props,
    style: style || webStyle ? { ...style, ...webStyle } : undefined,
  })
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
export function Rect(props: SvgRectProps): ReactElement {
  return shape('rect', props)
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
export function G(props: SvgGroupProps<ShapeNode>): ReactElement {
  return shape('g', props)
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
