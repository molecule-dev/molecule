/**
 * Vue whiteboard canvas: the Vue counterpart of
 * `@molecule/app-whiteboard-canvas-react`'s `<WhiteboardCanvas>` — the same
 * props (React names), the same ClassMap classes, the same inline geometry and
 * the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, shallowRef, type VNode } from 'vue'

import {
  CanvasSurface,
  type CanvasViewport,
  screenToCanvas,
  type ViewportLimits,
} from '@molecule/app-feature-canvas-vue'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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

const isStrokeTool = (tk: WhiteboardTool): tk is WhiteboardStrokeKind =>
  tk === 'pen' || tk === 'marker' || tk === 'eraser'

const isShapeTool = (tk: WhiteboardTool): tk is WhiteboardShapeKind =>
  tk === 'line' || tk === 'arrow' || tk === 'rect' || tk === 'ellipse'

/**
 * Whiteboard canvas — pen / marker / eraser / sticky-note / line /
 * arrow / shape / text tools layered on top of {@link CanvasSurface}
 * from `@molecule/app-feature-canvas-vue`.
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
 * @param props - Component props (see {@link WhiteboardCanvasProps}).
 * @returns The whiteboard canvas component.
 */
export const WhiteboardCanvas = defineComponent({
  name: 'WhiteboardCanvas',
  props: {
    strokes: { type: Array as PropType<WhiteboardStroke[]>, required: true },
    shapes: { type: Array as PropType<WhiteboardShape[]>, required: true },
    stickyNotes: { type: Array as PropType<WhiteboardStickyNote[]>, required: true },
    onChange: {
      type: Function as PropType<(change: WhiteboardChange) => void>,
      required: true,
    },
    tool: { type: String as PropType<WhiteboardTool>, required: true },
    strokeColor: { type: String, default: undefined },
    strokeWidth: { type: Number, default: undefined },
    stickyBackground: { type: String, default: undefined },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    initialViewport: { type: Object as PropType<CanvasViewport>, default: undefined },
    viewportLimits: { type: Object as PropType<ViewportLimits>, default: undefined },
    readOnly: { type: Boolean, default: false },
    ariaLabel: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // React's `useState` seed: the initial viewport is read once, so a later
    // `initialViewport` prop never resets the viewport.
    const viewport = ref<CanvasViewport>(props.initialViewport ?? { x: 0, y: 0, zoom: 1 })

    // The tool layer element, for screen-space reference measurements.
    let innerEl: HTMLDivElement | null = null

    // Active in-flight stroke (pen / marker / eraser).
    const activeStroke = shallowRef<WhiteboardStroke | null>(null)
    // Active in-flight shape (line / arrow / rect / ellipse).
    const activeShape = shallowRef<WhiteboardShape | null>(null)
    // Active pointer id, so multi-touch / pen pressure don't cross-fire.
    let activePointerId: number | null = null

    /**
     * Translate a raw pointer event into canvas-space using the surface's
     * inner layer as the screen-space reference. We intentionally do NOT
     * read transforms via getComputedStyle — the inner layer is rendered
     * at the canvas-space origin, so its bounding rect already accounts
     * for the viewport translate + zoom.
     *
     * @param e - The pointer event.
     * @returns The point in canvas-space.
     */
    const eventToCanvas = (e: PointerEvent): { x: number; y: number } => {
      const el = innerEl
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      // Use the parent surface (the canvas-surface root) as the
      // screen-space origin; the inner layer's rect is offset/scaled by
      // the current viewport transform, but the surface itself isn't.
      const surfaceEl = el.parentElement ?? el
      const surfaceRect = surfaceEl.getBoundingClientRect()
      const screenPoint = {
        x: e.clientX - surfaceRect.left,
        y: e.clientY - surfaceRect.top,
      }
      // We rely on the surface's data-canvas-* attrs for the most
      // accurate viewport (state may be a tick behind during fast
      // pointer streams).
      const innerZoom = Number(el.dataset.canvasZoom ?? viewport.value.zoom) || 1
      const innerX = Number(el.dataset.canvasX ?? viewport.value.x) || 0
      const innerY = Number(el.dataset.canvasY ?? viewport.value.y) || 0
      // Avoid the unused-rect lint by keeping the rect call above; it
      // also forces a reflow read so jsdom tests get consistent
      // measurements.
      void rect
      return screenToCanvas(screenPoint, { x: innerX, y: innerY, zoom: innerZoom })
    }

    /**
     * Starts a gesture on the tool layer: stroke / shape drafts commit on
     * pointer up; sticky notes commit here.
     *
     * @param e - The pointerdown event.
     */
    const onInnerPointerDown = (e: PointerEvent): void => {
      if (props.readOnly) return
      if (props.tool === 'select') return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      // Block surface pan for our active gesture.
      e.stopPropagation()
      activePointerId = e.pointerId
      try {
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      } catch (_error) {
        /* jsdom can throw — safe to ignore. */
      }
      const point = eventToCanvas(e)

      if (isStrokeTool(props.tool)) {
        activeStroke.value = {
          id: generateWhiteboardId(),
          kind: props.tool,
          points: [point],
          color: props.strokeColor ?? defaultStrokeColor(props.tool),
          width: props.strokeWidth ?? defaultStrokeWidth(props.tool),
        }
        return
      }

      if (isShapeTool(props.tool)) {
        const style = defaultShapeStyle(props.tool)
        activeShape.value = {
          id: generateWhiteboardId(),
          kind: props.tool,
          from: point,
          to: point,
          stroke: props.strokeColor ?? style.stroke,
          strokeWidth: props.strokeWidth ?? style.strokeWidth,
          fill: style.fill,
        }
        return
      }

      if (props.tool === 'sticky' || props.tool === 'text') {
        const sticky = defaultStickyNoteStyle()
        const placeholder = t(
          'whiteboard.stickyNote.placeholder',
          {},
          {
            defaultValue: 'New note',
          },
        )
        const newNote: WhiteboardStickyNote = {
          id: generateWhiteboardId(),
          position: { x: point.x - sticky.width / 2, y: point.y - sticky.height / 2 },
          width: sticky.width,
          height: sticky.height,
          text: placeholder,
          background:
            props.stickyBackground ?? (props.tool === 'text' ? 'transparent' : sticky.background),
          color: sticky.color,
        }
        props.onChange({
          strokes: props.strokes,
          shapes: props.shapes,
          stickyNotes: [...props.stickyNotes, newNote],
        })
        // Sticky notes are committed on tap-down — no drag needed.
        activePointerId = null
      }
    }

    /**
     * Extends the in-flight stroke or shape to the pointer's position.
     *
     * @param e - The pointermove event.
     */
    const onInnerPointerMove = (e: PointerEvent): void => {
      if (activePointerId !== e.pointerId) return
      const point = eventToCanvas(e)
      if (activeStroke.value) {
        activeStroke.value = {
          ...activeStroke.value,
          points: [...activeStroke.value.points, point],
        }
        return
      }
      if (activeShape.value) {
        activeShape.value = { ...activeShape.value, to: point }
      }
    }

    /**
     * Commits the in-flight stroke or shape (or discards a zero-size
     * shape) and releases the pointer.
     *
     * @param e - The pointerup or pointercancel event.
     */
    const finishGesture = (e: PointerEvent): void => {
      if (activePointerId !== e.pointerId) return
      activePointerId = null
      try {
        ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
      } catch (_error) {
        /* jsdom — safe to ignore. */
      }
      if (activeStroke.value) {
        // Commit the stroke even if it's a single tap (1 point) — that
        // represents a dot mark.
        const next = [...props.strokes, activeStroke.value]
        activeStroke.value = null
        props.onChange({ strokes: next, shapes: props.shapes, stickyNotes: props.stickyNotes })
        return
      }
      if (activeShape.value) {
        const b = shapeBounds(activeShape.value)
        // Drop zero-size shapes (a click without drag).
        if (b.width < 1 && b.height < 1) {
          activeShape.value = null
          return
        }
        const next = [...props.shapes, activeShape.value]
        activeShape.value = null
        props.onChange({ strokes: props.strokes, shapes: next, stickyNotes: props.stickyNotes })
      }
    }

    return (): VNode => {
      // All committed strokes plus the in-flight stroke for live preview.
      const renderStrokes: WhiteboardStroke[] = activeStroke.value
        ? [...props.strokes, activeStroke.value]
        : props.strokes
      const renderShapes: WhiteboardShape[] = activeShape.value
        ? [...props.shapes, activeShape.value]
        : props.shapes

      const innerStyle = {
        position: 'absolute',
        inset: '0px',
        // Only intercept events when a tool is active (incl. sticky/text).
        pointerEvents: props.tool === 'select' || props.readOnly ? 'none' : 'auto',
      }

      const resolvedAriaLabel =
        props.ariaLabel ?? t('whiteboard.aria.canvas', {}, { defaultValue: 'Whiteboard canvas' })

      const svgStyle = {
        position: 'absolute',
        top: '0px',
        left: '0px',
        overflow: 'visible',
        pointerEvents: 'none',
      }

      const shapeNodes = renderShapes.map((shape): VNode => {
        if (shape.kind === 'rect') {
          const b = shapeBounds(shape)
          return h('rect', {
            key: shape.id,
            'data-mol-id': 'whiteboard-canvas-shape',
            'data-shape-kind': shape.kind,
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            stroke: shape.stroke,
            'stroke-width': shape.strokeWidth,
            fill: shape.fill ?? 'none',
          })
        }
        if (shape.kind === 'ellipse') {
          const b = shapeBounds(shape)
          return h('ellipse', {
            key: shape.id,
            'data-mol-id': 'whiteboard-canvas-shape',
            'data-shape-kind': shape.kind,
            cx: b.x + b.width / 2,
            cy: b.y + b.height / 2,
            rx: b.width / 2,
            ry: b.height / 2,
            stroke: shape.stroke,
            'stroke-width': shape.strokeWidth,
            fill: shape.fill ?? 'none',
          })
        }
        return h('path', {
          key: shape.id,
          'data-mol-id': 'whiteboard-canvas-shape',
          'data-shape-kind': shape.kind,
          d: buildShapePath(shape),
          stroke: shape.stroke,
          'stroke-width': shape.strokeWidth,
          fill: 'none',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        })
      })

      const strokeNodes = renderStrokes.map((stroke): VNode =>
        h('path', {
          key: stroke.id,
          'data-mol-id': 'whiteboard-canvas-stroke',
          'data-stroke-kind': stroke.kind,
          d: buildStrokePath(stroke.points),
          stroke: stroke.color,
          'stroke-width': stroke.width,
          fill: 'none',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          opacity: stroke.kind === 'eraser' ? 0.4 : 1,
        }),
      )

      const stickyNodes = props.stickyNotes.map((note): VNode =>
        h(
          'div',
          {
            key: note.id,
            'data-mol-id': 'whiteboard-canvas-sticky',
            class: cm.cn(cm.position('absolute')),
            style: {
              position: 'absolute',
              left: `${note.position.x}px`,
              top: `${note.position.y}px`,
              width: `${note.width}px`,
              height: `${note.height}px`,
              background: note.background,
              color: note.color,
              padding: '8px',
              boxSizing: 'border-box',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              pointerEvents: 'none',
            },
          },
          [note.text],
        ),
      )

      return h(
        CanvasSurface,
        {
          viewport: viewport.value,
          onViewportChange: (next: CanvasViewport) => {
            viewport.value = next
          },
          width: props.width,
          height: props.height,
          limits: props.viewportLimits,
          ariaLabel: resolvedAriaLabel,
          className: cm.cn(cm.surfaceSecondary, props.className),
        },
        () => [
          h(
            'div',
            {
              ref: (el: unknown) => {
                innerEl = el as HTMLDivElement | null
              },
              'data-mol-id': 'whiteboard-canvas-tool-layer',
              'data-whiteboard-tool': props.tool,
              // Synced with the surface's inner layer transform via the parent.
              // We piggy-back on the surface's inner-layer data attrs by
              // pulling them from our parent in `eventToCanvas`.
              style: innerStyle,
              onPointerdown: onInnerPointerDown,
              onPointermove: onInnerPointerMove,
              onPointerup: finishGesture,
              onPointercancel: finishGesture,
            },
            [
              h(
                'svg',
                {
                  'data-mol-id': 'whiteboard-canvas-svg',
                  width: props.width,
                  height: props.height,
                  // Render in canvas-space; the parent's CSS transform handles
                  // pan + zoom, so we use the natural canvas coordinate system.
                  style: svgStyle,
                },
                [...shapeNodes, ...strokeNodes],
              ),
              ...stickyNodes,
            ],
          ),
        ],
      )
    }
  },
})
