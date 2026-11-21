import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { CanvasEdgeKind, CanvasEdgeProps, Point } from './types.js'

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
 * This is the Solid counterpart of `@molecule/app-feature-canvas-react`'s
 * `<CanvasEdge>`: the same props (React names) and the same DOM for the same
 * input.
 *
 * @param props - Component props (see {@link CanvasEdgeProps}).
 * @returns The rendered canvas edge.
 */
export const CanvasEdge: Component<CanvasEdgeProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const margin = (): number => Math.max(20, (props.strokeWidth ?? 2) * 4)
  const minX = (): number => Math.min(props.from.x, props.to.x) - margin()
  const minY = (): number => Math.min(props.from.y, props.to.y) - margin()
  const width = (): number => Math.abs(props.to.x - props.from.x) + margin() * 2
  const height = (): number => Math.abs(props.to.y - props.from.y) + margin() * 2

  // The path in viewBox-local coordinates, so the <svg> can sit at (minX, minY)
  // with the geometry inside starting at 0,0.
  const localFrom = (): Point => ({ x: props.from.x - minX(), y: props.from.y - minY() })
  const localTo = (): Point => ({ x: props.to.x - minX(), y: props.to.y - minY() })
  const d = (): string => buildEdgePath(localFrom(), localTo(), props.kind ?? 'line')

  const wrapperStyle = (): string =>
    `position: absolute; left: ${minX()}px; top: ${minY()}px; width: ${width()}px; height: ${height()}px; pointer-events: none; overflow: visible`

  const resolvedAriaLabel = (): string =>
    props.ariaLabel ?? t('canvas.aria.edge', {}, { defaultValue: 'Canvas edge' })

  return (
    <svg
      role="img"
      aria-label={resolvedAriaLabel()}
      data-mol-id="canvas-edge"
      data-edge-kind={props.kind ?? 'line'}
      class={cm.cn(cm.position('absolute'), props.className)}
      style={wrapperStyle()}
      width={width()}
      height={height()}
      viewBox={`0 0 ${width()} ${height()}`}
    >
      <path
        d={d()}
        fill="none"
        stroke={props.stroke ?? 'currentColor'}
        stroke-width={props.strokeWidth ?? 2}
        stroke-linecap="round"
        stroke-linejoin="round"
        data-mol-id="canvas-edge-path"
      />
    </svg>
  )
}
