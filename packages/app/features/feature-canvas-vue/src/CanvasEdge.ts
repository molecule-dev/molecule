/**
 * Vue generic canvas edge between two canvas-space points.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { CanvasEdgeKind, Point } from './types.js'

/**
 * Build the SVG `path` `d` attribute for one of the supported edge kinds.
 *
 * @param from - Edge start in canvas-space.
 * @param to - Edge end in canvas-space.
 * @param kind - Edge geometry.
 * @returns SVG path data.
 */
export function buildEdgePath(from: Point, to: Point, kind: CanvasEdgeKind): string {
  if (kind === 'orthogonal') {
    return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`
  }
  if (kind === 'bezier') {
    const handle = Math.max(20, Math.abs(to.x - from.x) / 2)
    const c1x = from.x + handle
    const c1y = from.y
    const c2x = to.x - handle
    const c2y = to.y
    return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`
  }
  // 'line'
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}

/**
 * Generic edge between two canvas-space points. Renders an absolutely-
 * positioned SVG that spans the bounding box of the two endpoints (with
 * a small overflow margin so curves and bezier handles aren't clipped).
 *
 * Domain semantics (which nodes are connected, edge labels, arrowheads,
 * directionality) live in wrapper packages — this base just draws the
 * geometry.
 *
 * This is the Vue counterpart of `@molecule/app-feature-canvas-react`'s
 * `<CanvasEdge>`: the same props (React names) and the same DOM for the same
 * input.
 *
 * @param props - Component props (React names).
 * @returns The edge component.
 */
export const CanvasEdge = defineComponent({
  name: 'CanvasEdge',
  props: {
    from: { type: Object as PropType<Point>, required: true },
    to: { type: Object as PropType<Point>, required: true },
    kind: { type: String as PropType<CanvasEdgeKind>, default: 'line' },
    strokeWidth: { type: Number, default: 2 },
    stroke: { type: String, default: 'currentColor' },
    ariaLabel: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const margin = Math.max(20, props.strokeWidth * 4)
      const minX = Math.min(props.from.x, props.to.x) - margin
      const minY = Math.min(props.from.y, props.to.y) - margin
      const width = Math.abs(props.to.x - props.from.x) + margin * 2
      const height = Math.abs(props.to.y - props.from.y) + margin * 2

      // Express the path in viewBox-local coordinates so the <svg> can sit at
      // (minX, minY) with the geometry inside starting at 0,0.
      const localFrom: Point = { x: props.from.x - minX, y: props.from.y - minY }
      const localTo: Point = { x: props.to.x - minX, y: props.to.y - minY }
      const d = buildEdgePath(localFrom, localTo, props.kind)

      const resolvedAriaLabel =
        props.ariaLabel ?? t('canvas.aria.edge', {}, { defaultValue: 'Canvas edge' })

      return h(
        'svg',
        {
          role: 'img',
          'aria-label': resolvedAriaLabel,
          'data-mol-id': 'canvas-edge',
          'data-edge-kind': props.kind,
          class: cm.cn(cm.position('absolute'), props.className),
          style: {
            position: 'absolute',
            left: `${minX}px`,
            top: `${minY}px`,
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'none',
            overflow: 'visible',
          },
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
        },
        [
          h('path', {
            d,
            fill: 'none',
            stroke: props.stroke,
            'stroke-width': props.strokeWidth,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'data-mol-id': 'canvas-edge-path',
          }),
        ],
      )
    }
  },
})
