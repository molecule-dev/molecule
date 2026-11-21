/**
 * Vue pure-presentational SVG renderer for a single {@link VectorElement}.
 * Does not own any state or pointer handlers — `<CanvasEngine>` wraps each
 * rendered element in its own pointer-capturing layer so the marquee selector
 * and multi-select gestures live in one place.
 *
 * The Vue counterpart of `@molecule/app-canvas-engine-react`'s
 * `<VectorElementSvg>`: the same attributes, styles and text for the same
 * element.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import type { VectorElement, VectorStyle } from './types.js'

/** `<VectorElementSvg>` props. */
export interface VectorElementSvgProps {
  /** Element to draw. */
  element: VectorElement
  /** Whether the element is currently selected (drives `data-selected`). */
  selected?: boolean
}

/** The style declarations an element's style fields resolve to. */
interface ResolvedStyle {
  /** Fill paint (`none` when the element has no fill). */
  fill: string | undefined
  /** Stroke paint, or `undefined` when the element has none. */
  stroke: string | undefined
  /** Stroke width, or `undefined` when the element has none. */
  strokeWidth: number | undefined
  /** Inline style for opacity and blend mode. */
  style: Record<string, string | number>
}

/** Read style fields off an element with sensible defaults applied. */
function resolveStyle(element: VectorStyle): ResolvedStyle {
  const fill = element.fill ?? 'none'
  const stroke = element.stroke
  const strokeWidth =
    stroke != null ? (element.strokeWidth ?? 1) : (element.strokeWidth ?? undefined)
  const style: Record<string, string | number> = {}
  if (element.opacity != null) style.opacity = element.opacity
  if (element.blendMode != null) style.mixBlendMode = element.blendMode
  return { fill, stroke, strokeWidth, style }
}

/** Apply an element's transform to an SVG `transform` string. */
function transformAttr(element: VectorElement): string | undefined {
  const t = element.transform
  if (!t) return undefined
  const parts: string[] = []
  // Rotate around the element centre (lines pivot around their midpoint).
  if (t.rotation != null && t.rotation !== 0) {
    let cx: number
    let cy: number
    if (element.kind === 'line') {
      cx = (element.x1 + element.x2) / 2
      cy = (element.y1 + element.y2) / 2
    } else {
      cx = element.x + element.width / 2
      cy = element.y + element.height / 2
    }
    parts.push(`rotate(${t.rotation} ${cx} ${cy})`)
  }
  if ((t.scaleX != null && t.scaleX !== 1) || (t.scaleY != null && t.scaleY !== 1)) {
    parts.push(`scale(${t.scaleX ?? 1} ${t.scaleY ?? 1})`)
  }
  return parts.length > 0 ? parts.join(' ') : undefined
}

/**
 * Render a single vector element as SVG. Group children render recursively.
 * The element is wrapped in a `<g>` so callers can attach data attributes
 * consistently.
 *
 * @param props - Component props (see {@link VectorElementSvgProps}).
 * @returns The SVG element.
 */
export const VectorElementSvg = defineComponent({
  name: 'VectorElementSvg',
  props: {
    element: { type: Object as PropType<VectorElement>, required: true },
    selected: { type: Boolean as PropType<boolean | undefined>, default: undefined },
  },
  setup(props) {
    return (): VNode => {
      const element = props.element
      const { fill, stroke, strokeWidth, style } = resolveStyle(element)
      const common = {
        'data-mol-id': 'canvas-engine-element',
        'data-canvas-element-id': element.id,
        'data-canvas-element-kind': element.kind,
        'data-selected': props.selected ? 'true' : 'false',
        transform: transformAttr(element),
        style,
      }

      switch (element.kind) {
        case 'rect':
          return h('g', common, [
            h('rect', {
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              rx: element.cornerRadius,
              ry: element.cornerRadius,
              fill,
              stroke,
              'stroke-width': strokeWidth,
            }),
          ])
        case 'ellipse':
          return h('g', common, [
            h('ellipse', {
              cx: element.x + element.width / 2,
              cy: element.y + element.height / 2,
              rx: element.width / 2,
              ry: element.height / 2,
              fill,
              stroke,
              'stroke-width': strokeWidth,
            }),
          ])
        case 'line':
          return h('g', common, [
            h('line', {
              x1: element.x1,
              y1: element.y1,
              x2: element.x2,
              y2: element.y2,
              stroke: stroke ?? fill,
              'stroke-width': strokeWidth ?? 1,
            }),
          ])
        case 'path':
          return h('g', common, [
            h('g', { transform: `translate(${element.x} ${element.y})` }, [
              h('path', { d: element.d, fill, stroke, 'stroke-width': strokeWidth }),
            ]),
          ])
        case 'text':
          return h('g', common, [
            h(
              'text',
              {
                x: element.x,
                y: element.y + (element.fontSize ?? 16),
                fill: element.fill ?? '#000000',
                stroke,
                'stroke-width': strokeWidth,
                'font-size': element.fontSize ?? 16,
                'font-family': element.fontFamily ?? 'system-ui, sans-serif',
                'font-weight': element.fontWeight ?? 'normal',
              },
              [element.text],
            ),
          ])
        case 'group':
          return h('g', common, [
            ...element.children.map((child) =>
              h(VectorElementSvg, {
                key: child.id,
                element: child,
                selected: props.selected,
              }),
            ),
          ])
      }
    }
  },
})
