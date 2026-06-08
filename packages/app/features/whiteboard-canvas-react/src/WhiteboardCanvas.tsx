import type { CSSProperties, JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useRef, useState } from 'react'

import {
  CanvasSurface,
  type CanvasViewport,
  screenToCanvas,
  type ViewportLimits,
} from '@molecule/app-feature-canvas-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  buildShapePath,
  buildStrokePath,
  defaultShapeStyle,
  defaultStickyNoteStyle,
  defaultStrokeColor,
  defaultStrokeWidth,
  generateWhiteboardId,
  shapeBounds,
} from './strokes.js'
import type {
  WhiteboardShape,
  WhiteboardShapeKind,
  WhiteboardStickyNote,
  WhiteboardStroke,
  WhiteboardStrokeKind,
  WhiteboardTool,
} from './types.js'

/** `onChange` payload for {@link WhiteboardCanvas}. */
export interface WhiteboardChange {
  /** Updated stroke list (controlled). */
  strokes: WhiteboardStroke[]
  /** Updated shape list (controlled). */
  shapes: WhiteboardShape[]
  /** Updated sticky-note list (controlled). */
  stickyNotes: WhiteboardStickyNote[]
}

/** {@link WhiteboardCanvas} props. */
export interface WhiteboardCanvasProps {
  /**
   * Free-form strokes (pen / marker / eraser) currently on the board.
   * Controlled — feed back through `onChange`.
   */
  strokes: WhiteboardStroke[]
  /** Vector shapes on the board. Controlled. */
  shapes: WhiteboardShape[]
  /** Sticky notes / text boxes on the board. Controlled. */
  stickyNotes: WhiteboardStickyNote[]
  /**
   * Called whenever the user finishes a tool gesture that mutates the
   * board (stroke ended, shape committed, sticky placed). The payload
   * is the COMPLETE post-gesture state — replace your local arrays
   * with it.
   */
  onChange: (change: WhiteboardChange) => void
  /** Active drawing tool. */
  tool: WhiteboardTool
  /**
   * Optional override for in-flight stroke color (pen / marker only).
   * If omitted, uses {@link defaultStrokeColor} for the tool.
   */
  strokeColor?: string
  /** Optional override for stroke width. */
  strokeWidth?: number
  /**
   * Optional sticky-note background color override (used by the
   * sticky tool when placing a new note).
   */
  stickyBackground?: string
  /** Surface width in CSS pixels. */
  width: number
  /** Surface height in CSS pixels. */
  height: number
  /** Optional initial viewport (uncontrolled CanvasSurface viewport). */
  initialViewport?: CanvasViewport
  /** Optional viewport clamping limits forwarded to `<CanvasSurface>`. */
  viewportLimits?: ViewportLimits
  /**
   * If true, every drawing tool is disabled (background pan still
   * works). Useful for read-only viewers / playback mode.
   */
  readOnly?: boolean
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Extra classes merged onto the wrapper. */
  className?: string
}

/**
 * React whiteboard canvas — pen / marker / eraser / sticky-note /
 * line / arrow / shape / text tools layered on top of
 * {@link CanvasSurface} from `@molecule/app-feature-canvas-react`.
 *
 * Pan + zoom are delegated entirely to the base — this component only
 * handles tool-specific pointer-event interpretation and rendering of
 * strokes, shapes, and sticky notes inside the canvas-space inner
 * layer. All styling goes through `getClassMap()`; all user-facing
 * text goes through `t()` — both per molecule architecture rules.
 *
 * Controlled state model: pass `strokes` / `shapes` / `stickyNotes`
 * and listen for `onChange`. Each completed gesture fires `onChange`
 * with the full post-gesture state.
 *
 * @param props - Component props.
 * @returns The whiteboard canvas element.
 * @example
 * ```tsx
 * const [tool, setTool] = useState<WhiteboardTool>('pen')
 * const [strokes, setStrokes] = useState<WhiteboardStroke[]>([])
 * const [shapes, setShapes] = useState<WhiteboardShape[]>([])
 * const [stickyNotes, setStickyNotes] = useState<WhiteboardStickyNote[]>([])
 * <WhiteboardCanvas
 *   tool={tool}
 *   strokes={strokes}
 *   shapes={shapes}
 *   stickyNotes={stickyNotes}
 *   onChange={(c) => {
 *     setStrokes(c.strokes)
 *     setShapes(c.shapes)
 *     setStickyNotes(c.stickyNotes)
 *   }}
 *   width={800}
 *   height={600}
 * />
 * ```
 */
export function WhiteboardCanvas(props: WhiteboardCanvasProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const {
    strokes,
    shapes,
    stickyNotes,
    onChange,
    tool,
    strokeColor,
    strokeWidth,
    stickyBackground,
    width,
    height,
    initialViewport,
    viewportLimits,
    readOnly,
    ariaLabel,
    className,
  } = props

  const [viewport, setViewport] = useState<CanvasViewport>(
    initialViewport ?? { x: 0, y: 0, zoom: 1 },
  )
  const innerRef = useRef<HTMLDivElement | null>(null)

  // Active in-flight stroke (pen / marker / eraser).
  const [activeStroke, setActiveStroke] = useState<WhiteboardStroke | null>(null)
  // Active in-flight shape (line / arrow / rect / ellipse).
  const [activeShape, setActiveShape] = useState<WhiteboardShape | null>(null)
  // Active pointer id, so multi-touch / pen pressure don't cross-fire.
  const activePointerId = useRef<number | null>(null)

  /**
   * Translate a raw pointer event into canvas-space using the surface's
   * inner layer as the screen-space reference. We intentionally do NOT
   * read transforms via getComputedStyle — the inner layer is rendered
   * at the canvas-space origin, so its bounding rect already accounts
   * for the viewport translate + zoom.
   */
  const eventToCanvas = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const innerEl = innerRef.current
      if (!innerEl) return { x: 0, y: 0 }
      const rect = innerEl.getBoundingClientRect()
      // Use the parent surface (the canvas-surface root) as the
      // screen-space origin; the inner layer's rect is offset/scaled by
      // the current viewport transform, but the surface itself isn't.
      const surfaceEl = innerEl.parentElement ?? innerEl
      const surfaceRect = surfaceEl.getBoundingClientRect()
      const screenPoint = {
        x: e.clientX - surfaceRect.left,
        y: e.clientY - surfaceRect.top,
      }
      // We rely on the surface's data-canvas-* attrs for the most
      // accurate viewport (state may be a tick behind during fast
      // pointer streams).
      const innerZoom = Number(innerEl.dataset.canvasZoom ?? viewport.zoom) || 1
      const innerX = Number(innerEl.dataset.canvasX ?? viewport.x) || 0
      const innerY = Number(innerEl.dataset.canvasY ?? viewport.y) || 0
      // Avoid the unused-rect lint by keeping the rect call above; it
      // also forces a reflow read so jsdom tests get consistent
      // measurements.
      void rect
      return screenToCanvas(screenPoint, { x: innerX, y: innerY, zoom: innerZoom })
    },
    [viewport],
  )

  const isStrokeTool = (tk: WhiteboardTool): tk is WhiteboardStrokeKind =>
    tk === 'pen' || tk === 'marker' || tk === 'eraser'

  const isShapeTool = (tk: WhiteboardTool): tk is WhiteboardShapeKind =>
    tk === 'line' || tk === 'arrow' || tk === 'rect' || tk === 'ellipse'

  const onInnerPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (readOnly) return
      if (tool === 'select') return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      // Block surface pan for our active gesture.
      e.stopPropagation()
      activePointerId.current = e.pointerId
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch (_error) {
        /* jsdom can throw — safe to ignore. */
      }
      const point = eventToCanvas(e)

      if (isStrokeTool(tool)) {
        setActiveStroke({
          id: generateWhiteboardId(),
          kind: tool,
          points: [point],
          color: strokeColor ?? defaultStrokeColor(tool),
          width: strokeWidth ?? defaultStrokeWidth(tool),
        })
        return
      }

      if (isShapeTool(tool)) {
        const style = defaultShapeStyle(tool)
        setActiveShape({
          id: generateWhiteboardId(),
          kind: tool,
          from: point,
          to: point,
          stroke: strokeColor ?? style.stroke,
          strokeWidth: strokeWidth ?? style.strokeWidth,
          fill: style.fill,
        })
        return
      }

      if (tool === 'sticky' || tool === 'text') {
        const sticky = defaultStickyNoteStyle()
        const placeholder = t('whiteboard.stickyNote.placeholder', {}, { defaultValue: 'New note' })
        const note: WhiteboardStickyNote = {
          id: generateWhiteboardId(),
          position: { x: point.x - sticky.width / 2, y: point.y - sticky.height / 2 },
          width: sticky.width,
          height: sticky.height,
          text: placeholder,
          background: stickyBackground ?? (tool === 'text' ? 'transparent' : sticky.background),
          color: sticky.color,
        }
        onChange({
          strokes,
          shapes,
          stickyNotes: [...stickyNotes, note],
        })
        // Sticky notes are committed on tap-down — no drag needed.
        activePointerId.current = null
      }
    },
    [
      readOnly,
      tool,
      eventToCanvas,
      strokeColor,
      strokeWidth,
      stickyBackground,
      onChange,
      strokes,
      shapes,
      stickyNotes,
      t,
    ],
  )

  const onInnerPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== e.pointerId) return
      const point = eventToCanvas(e)
      if (activeStroke) {
        setActiveStroke({
          ...activeStroke,
          points: [...activeStroke.points, point],
        })
        return
      }
      if (activeShape) {
        setActiveShape({ ...activeShape, to: point })
      }
    },
    [activeStroke, activeShape, eventToCanvas],
  )

  const finishGesture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== e.pointerId) return
      activePointerId.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch (_error) {
        /* jsdom — safe to ignore. */
      }
      if (activeStroke) {
        // Commit the stroke even if it's a single tap (1 point) — that
        // represents a dot mark.
        const next = [...strokes, activeStroke]
        setActiveStroke(null)
        onChange({ strokes: next, shapes, stickyNotes })
        return
      }
      if (activeShape) {
        const b = shapeBounds(activeShape)
        // Drop zero-size shapes (a click without drag).
        if (b.width < 1 && b.height < 1) {
          setActiveShape(null)
          return
        }
        const next = [...shapes, activeShape]
        setActiveShape(null)
        onChange({ strokes, shapes: next, stickyNotes })
      }
    },
    [activeStroke, activeShape, onChange, strokes, shapes, stickyNotes],
  )

  const innerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    // Only intercept events when a tool is active (incl. sticky/text).
    pointerEvents: tool === 'select' || readOnly ? 'none' : 'auto',
  }

  const resolvedAriaLabel =
    ariaLabel ?? t('whiteboard.aria.canvas', {}, { defaultValue: 'Whiteboard canvas' })

  // All committed strokes plus the in-flight stroke for live preview.
  const renderStrokes: WhiteboardStroke[] = activeStroke ? [...strokes, activeStroke] : strokes
  const renderShapes: WhiteboardShape[] = activeShape ? [...shapes, activeShape] : shapes

  return (
    <CanvasSurface
      viewport={viewport}
      onViewportChange={setViewport}
      width={width}
      height={height}
      limits={viewportLimits}
      ariaLabel={resolvedAriaLabel}
      className={cm.cn(cm.surfaceSecondary, className)}
    >
      <div
        ref={innerRef}
        data-mol-id="whiteboard-canvas-tool-layer"
        data-whiteboard-tool={tool}
        // Synced with the surface's inner layer transform via the parent.
        // We piggy-back on the surface's inner-layer data attrs by
        // pulling them from our parent in `eventToCanvas`.
        style={innerStyle}
        onPointerDown={onInnerPointerDown}
        onPointerMove={onInnerPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
      >
        <svg
          data-mol-id="whiteboard-canvas-svg"
          width={width}
          height={height}
          // Render in canvas-space; the parent's CSS transform handles
          // pan + zoom, so we use the natural canvas coordinate system.
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          {renderShapes.map((shape) => {
            if (shape.kind === 'rect') {
              const b = shapeBounds(shape)
              return (
                <rect
                  key={shape.id}
                  data-mol-id="whiteboard-canvas-shape"
                  data-shape-kind={shape.kind}
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.height}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill ?? 'none'}
                />
              )
            }
            if (shape.kind === 'ellipse') {
              const b = shapeBounds(shape)
              return (
                <ellipse
                  key={shape.id}
                  data-mol-id="whiteboard-canvas-shape"
                  data-shape-kind={shape.kind}
                  cx={b.x + b.width / 2}
                  cy={b.y + b.height / 2}
                  rx={b.width / 2}
                  ry={b.height / 2}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  fill={shape.fill ?? 'none'}
                />
              )
            }
            return (
              <path
                key={shape.id}
                data-mol-id="whiteboard-canvas-shape"
                data-shape-kind={shape.kind}
                d={buildShapePath(shape)}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}
          {renderStrokes.map((stroke) => (
            <path
              key={stroke.id}
              data-mol-id="whiteboard-canvas-stroke"
              data-stroke-kind={stroke.kind}
              d={buildStrokePath(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={stroke.kind === 'eraser' ? 0.4 : 1}
            />
          ))}
        </svg>
        {stickyNotes.map((note) => (
          <div
            key={note.id}
            data-mol-id="whiteboard-canvas-sticky"
            className={cm.cn(cm.position('absolute'))}
            style={{
              position: 'absolute',
              left: note.position.x,
              top: note.position.y,
              width: note.width,
              height: note.height,
              background: note.background,
              color: note.color,
              padding: 8,
              boxSizing: 'border-box',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {note.text}
          </div>
        ))}
      </div>
    </CanvasSurface>
  )
}
