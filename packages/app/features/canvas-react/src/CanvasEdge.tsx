import type { CSSProperties } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { CanvasEdgeKind, Point } from './types.js'

/** `<CanvasEdge>` props. */
export interface CanvasEdgeProps {
  /** Edge starting point in canvas-space. */
  from: Point
  /** Edge ending point in canvas-space. */
  to: Point
  /**
   * Edge geometry. `'line'` is a straight segment, `'bezier'` is a
   * cubic with horizontal-first handles, `'orthogonal'` is a
   * right-angle path that goes horizontal-then-vertical from `from`.
   * Defaults to `'line'`.
   */
  kind?: CanvasEdgeKind
  /** Stroke width in canvas units. Defaults to `2`. */
  strokeWidth?: number
  /** SVG `stroke` attribute (color). Defaults to `'currentColor'`. */
  stroke?: string
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string
}

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
 * @param props - Component props.
 * @returns The edge element.
 */
export function CanvasEdge(props: CanvasEdgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    from,
    to,
    kind = 'line',
    strokeWidth = 2,
    stroke = 'currentColor',
    ariaLabel,
    className,
  } = props

  const margin = Math.max(20, strokeWidth * 4)
  const minX = Math.min(from.x, to.x) - margin
  const minY = Math.min(from.y, to.y) - margin
  const width = Math.abs(to.x - from.x) + margin * 2
  const height = Math.abs(to.y - from.y) + margin * 2

  // Express the path in viewBox-local coordinates so we can position the
  // <svg> at (minX, minY) and have the geometry inside start at 0,0.
  const localFrom: Point = { x: from.x - minX, y: from.y - minY }
  const localTo: Point = { x: to.x - minX, y: to.y - minY }
  const d = buildEdgePath(localFrom, localTo, kind)

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: minX,
    top: minY,
    width,
    height,
    pointerEvents: 'none',
    overflow: 'visible',
  }

  const resolvedAriaLabel = ariaLabel ?? t('canvas.aria.edge', {}, { defaultValue: 'Canvas edge' })

  return (
    <svg
      role="img"
      aria-label={resolvedAriaLabel}
      data-mol-id="canvas-edge"
      data-edge-kind={kind}
      className={cm.cn(cm.position('absolute'), className)}
      style={wrapperStyle}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        data-mol-id="canvas-edge-path"
      />
    </svg>
  )
}
