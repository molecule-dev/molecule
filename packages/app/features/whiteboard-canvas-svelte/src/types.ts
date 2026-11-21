/**
 * Whiteboard canvas types: tool selector + the three element kinds the
 * whiteboard renders (free-form strokes, vector shapes, sticky notes /
 * text boxes).
 *
 * All coordinates are canvas-space (top-left origin, +x right, +y down) —
 * pan/zoom is handled by `<CanvasSurface>` from
 * `@molecule/app-feature-canvas-svelte`, so wrappers don't deal with
 * screen-space here.
 *
 * @module
 */

import type { CanvasViewport, Point, ViewportLimits } from '@molecule/app-feature-canvas-svelte'

/** Stroke produced by the pen tool — Bezier-smoothed free-form path. */
export type WhiteboardStrokeKind = 'pen' | 'marker' | 'eraser'

/**
 * A free-form stroke (pen / marker / eraser). `points` is the raw
 * sampled pointer trail in canvas-space; rendering smooths the path
 * via quadratic Bezier midpoints. The eraser kind is itself a stroke
 * (so it round-trips through `onChange`) — consumers use
 * `applyEraserStrokes` to diff erasers against earlier strokes when
 * persisting.
 */
export interface WhiteboardStroke {
  /** Stable id for selection / undo / realtime broadcast. */
  id: string
  /** Tool that produced the stroke. */
  kind: WhiteboardStrokeKind
  /** Raw sampled points in canvas-space. */
  points: Point[]
  /** CSS color string. Defaults are tool-specific. */
  color: string
  /** Stroke width in canvas units. Marker uses a fixed width. */
  width: number
}

/** Vector shape kinds the whiteboard knows how to draw. */
export type WhiteboardShapeKind = 'line' | 'arrow' | 'rect' | 'ellipse'

/**
 * A vector shape defined by two canvas-space corner points (`from`,
 * `to`). `rect` and `ellipse` derive their bounding rect from the
 * two points; `line` and `arrow` render as straight segments.
 */
export interface WhiteboardShape {
  /** Stable id for selection / undo / realtime broadcast. */
  id: string
  /** Geometry kind. */
  kind: WhiteboardShapeKind
  /** Canvas-space start point. */
  from: Point
  /** Canvas-space end point. */
  to: Point
  /** Stroke color. */
  stroke: string
  /** Stroke width in canvas units. */
  strokeWidth: number
  /** Optional fill (rect / ellipse only). */
  fill?: string
}

/**
 * A sticky note / text box positioned in canvas-space. `width` /
 * `height` are canvas-space; `text` is the user-entered content.
 * Plain `text` tool uses the same shape but with a transparent
 * background.
 */
export interface WhiteboardStickyNote {
  /** Stable id for selection / undo / realtime broadcast. */
  id: string
  /** Canvas-space top-left. */
  position: Point
  /** Canvas-space size. */
  width: number
  /** Canvas-space size. */
  height: number
  /** Note body text. */
  text: string
  /** Background fill. Use a transparent CSS color for plain text. */
  background: string
  /** Text color. */
  color: string
}

/**
 * Aggregate of every element kind on the board. This is what
 * persistence layers serialize, what realtime broadcasts mirror, and
 * what {@link WhiteboardCanvas} consumes via `strokes`, `shapes`, and
 * `stickyNotes` props (controlled).
 */
export interface WhiteboardSnapshot {
  /** All free-form strokes (pen / marker / eraser) in chronological order. */
  strokes: WhiteboardStroke[]
  /** All vector shapes. */
  shapes: WhiteboardShape[]
  /** All sticky notes / text boxes. */
  stickyNotes: WhiteboardStickyNote[]
}

/**
 * The active tool. `select` is a no-op pass-through for the canvas —
 * consumers can build their own selection / move logic on top.
 */
export type WhiteboardTool =
  'pen' | 'marker' | 'eraser' | 'sticky' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'select'

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
