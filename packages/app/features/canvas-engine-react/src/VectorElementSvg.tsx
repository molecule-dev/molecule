/**
 * Pure-presentational SVG renderer for a single {@link VectorElement}.
 * Does not own any state or pointer handlers — `<CanvasEngine>` wraps
 * each rendered element in its own pointer-capturing layer so the
 * marquee selector / multi-select gestures live in one place.
 *
 * @module
 */

import type { CSSProperties, ReactElement } from 'react'

import type { VectorElement, VectorStyle } from './types.js'

/** `<VectorElementSvg>` props. */
export interface VectorElementSvgProps {
  /** Element to draw. */
  element: VectorElement
  /** Whether the element is currently selected (drives `data-selected`). */
  selected?: boolean
}

/** Read style fields off an element with sensible defaults applied. */
function resolveStyle(element: VectorStyle): {
  fill: string | undefined
  stroke: string | undefined
  strokeWidth: number | undefined
  style: CSSProperties
} {
  const fill = element.fill ?? 'none'
  const stroke = element.stroke
  const strokeWidth =
    stroke != null ? (element.strokeWidth ?? 1) : (element.strokeWidth ?? undefined)
  const style: CSSProperties = {}
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
 * Render a single vector element as SVG. Group children render
 * recursively. The element is wrapped in a `<g>` so callers can
 * attach data attributes consistently.
 *
 * @param props - Component props.
 * @returns The rendered SVG element.
 */
export function VectorElementSvg(props: VectorElementSvgProps): ReactElement {
  const { element, selected } = props
  const { fill, stroke, strokeWidth, style } = resolveStyle(element)
  const transform = transformAttr(element)
  const common = {
    'data-mol-id': 'canvas-engine-element',
    'data-canvas-element-id': element.id,
    'data-canvas-element-kind': element.kind,
    'data-selected': selected ? 'true' : 'false',
    transform,
    style,
  } as const

  switch (element.kind) {
    case 'rect':
      return (
        <g {...common}>
          <rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rx={element.cornerRadius}
            ry={element.cornerRadius}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    case 'ellipse':
      return (
        <g {...common}>
          <ellipse
            cx={element.x + element.width / 2}
            cy={element.y + element.height / 2}
            rx={element.width / 2}
            ry={element.height / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      )
    case 'line':
      return (
        <g {...common}>
          <line
            x1={element.x1}
            y1={element.y1}
            x2={element.x2}
            y2={element.y2}
            stroke={stroke ?? fill}
            strokeWidth={strokeWidth ?? 1}
          />
        </g>
      )
    case 'path':
      return (
        <g {...common}>
          <g transform={`translate(${element.x} ${element.y})`}>
            <path d={element.d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </g>
        </g>
      )
    case 'text':
      return (
        <g {...common}>
          <text
            x={element.x}
            y={element.y + (element.fontSize ?? 16)}
            fill={element.fill ?? '#000000'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fontSize={element.fontSize ?? 16}
            fontFamily={element.fontFamily ?? 'system-ui, sans-serif'}
            fontWeight={element.fontWeight ?? 'normal'}
          >
            {element.text}
          </text>
        </g>
      )
    case 'group':
      return (
        <g {...common}>
          {element.children.map((child) => (
            <VectorElementSvg key={child.id} element={child} selected={selected} />
          ))}
        </g>
      )
  }
}
