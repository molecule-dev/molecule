/**
 * Svg and its shapes.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type {
  SvgCircleProps,
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
import { webElementStyle } from './style.js'
import type { ElementNode, ElementRefProps, ShapeNode } from './types.js'

/**
 * An SVG canvas: renders exactly an `<svg>`. On React Native it is react-native-svg's `Svg`.
 *
 * @param props - See {@link SvgProps}.
 * @returns The element.
 */
export function Svg({
  ref,
  webStyle,
  ...props
}: SvgProps<ShapeNode> & ElementRefProps): ReactElement {
  return createElement('svg', {
    ...props,
    ref: useElementRef(ref),
    style: webElementStyle(undefined, webStyle),
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
  webStyle,
  markup,
  ...props
}: SvgMarkupProps & ElementRefProps): ReactElement {
  return createElement('svg', {
    ...props,
    ref: useElementRef(ref),
    style: webElementStyle(undefined, webStyle),
    dangerouslySetInnerHTML: { __html: markup },
  })
}

/**
 * An SVG `<path>`.
 *
 * @param props - See {@link SvgPathProps}.
 * @returns The element.
 */
export function Path(props: SvgPathProps): ReactElement {
  return createElement('path', props)
}

/**
 * An SVG `<rect>`.
 *
 * @param props - See {@link SvgRectProps}.
 * @returns The element.
 */
export function Rect(props: SvgRectProps): ReactElement {
  return createElement('rect', props)
}

/**
 * An SVG `<circle>`.
 *
 * @param props - See {@link SvgCircleProps}.
 * @returns The element.
 */
export function Circle(props: SvgCircleProps): ReactElement {
  return createElement('circle', props)
}

/**
 * An SVG `<ellipse>`.
 *
 * @param props - See {@link SvgEllipseProps}.
 * @returns The element.
 */
export function Ellipse(props: SvgEllipseProps): ReactElement {
  return createElement('ellipse', props)
}

/**
 * An SVG `<line>`.
 *
 * @param props - See {@link SvgLineProps}.
 * @returns The element.
 */
export function Line(props: SvgLineProps): ReactElement {
  return createElement('line', props)
}

/**
 * An SVG `<polyline>`.
 *
 * @param props - See {@link SvgPolyProps}.
 * @returns The element.
 */
export function Polyline(props: SvgPolyProps): ReactElement {
  return createElement('polyline', props)
}

/**
 * An SVG `<polygon>`.
 *
 * @param props - See {@link SvgPolyProps}.
 * @returns The element.
 */
export function Polygon(props: SvgPolyProps): ReactElement {
  return createElement('polygon', props)
}

/**
 * An SVG group, `<g>`.
 *
 * @param props - See {@link SvgGroupProps}.
 * @returns The element.
 */
export function G(props: SvgGroupProps<ShapeNode>): ReactElement {
  return createElement('g', props)
}

/**
 * SVG `<text>`.
 *
 * @param props - See {@link SvgTextProps}.
 * @returns The element.
 */
export function SvgText(props: SvgTextProps<ElementNode>): ReactElement {
  return createElement('text', props)
}
