import type { CSSProperties, JSX, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useCallback, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { CanvasDragInfo, CanvasItemId, CanvasResizeInfo, Point, Size } from './types.js'

/** `<CanvasNode>` props. */
export interface CanvasNodeProps {
  /** Optional id, surfaced on `data-canvas-node-id` and via `onSelect`. */
  id?: CanvasItemId
  /** Canvas-space top-left position of the node. */
  position: Point
  /** Optional canvas-space size. If omitted, the node sizes to content. */
  size?: Size
  /** Whether the node is currently selected (drives data attributes only). */
  selected?: boolean
  /**
   * Called when the user activates the node (pointerdown that doesn't
   * become a drag). Receives the node id (if set) and the original
   * pointer event so consumers can read modifier keys for additive
   * selection.
   */
  onSelect?: (id: CanvasItemId | undefined, e: ReactPointerEvent<HTMLDivElement>) => void
  /**
   * Called continuously during a drag gesture. The base does NOT
   * mutate `position` itself — consumers update their own state from
   * `info.position` and feed it back through props.
   *
   * Drag deltas are computed in CANVAS-space using the surface's
   * current zoom (read from the parent surface's `data-canvas-zoom`).
   */
  onDrag?: (info: CanvasDragInfo) => void
  /**
   * Called continuously during a resize gesture from the SE corner.
   * `info.size` is canvas-space; `info.position` matches the original
   * top-left (resize-from-SE doesn't shift the origin).
   */
  onResize?: (info: CanvasResizeInfo) => void
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Children render inside the node, in canvas-space. */
  children?: ReactNode
  /** Extra classes merged onto the wrapper. */
  className?: string
}

/**
 * Read the canvas zoom from the nearest surface ancestor (defaults to 1).
 * @param el
 */
function readSurfaceZoom(el: Element | null): number {
  let cur: Element | null = el
  while (cur) {
    const z = cur.getAttribute?.('data-canvas-zoom')
    if (z != null) {
      const parsed = parseFloat(z)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
    cur = cur.parentElement
  }
  return 1
}

/**
 * Generic positioned + draggable + resizable wrapper. Renders into the
 * canvas-coordinate-space layer of `<CanvasSurface>`.
 *
 * The base is intentionally minimal — it owns:
 *   - absolute positioning at `position` (canvas units).
 *   - optional explicit `size` (canvas units).
 *   - `onSelect` on pointerdown (with `e.stopPropagation()` so the
 *     surface doesn't pan).
 *   - `onDrag` from any pointerdown on the node body.
 *   - `onResize` from a SE-corner handle (only rendered if `onResize`
 *     is supplied).
 *
 * It does NOT own visual chrome — wrapper packages compose chrome on
 * top via `children`.
 *
 * @param props - Component props.
 * @returns The node element.
 */
export function CanvasNode(props: CanvasNodeProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    id,
    position,
    size,
    selected,
    onSelect,
    onDrag,
    onResize,
    ariaLabel,
    children,
    className,
  } = props

  const dragPointerId = useRef<number | null>(null)
  const dragLastScreen = useRef<{ x: number; y: number } | null>(null)
  const dragPosition = useRef<Point>(position)
  const movedDuringGesture = useRef<boolean>(false)

  const resizePointerId = useRef<number | null>(null)
  const resizeStartScreen = useRef<{ x: number; y: number } | null>(null)
  const resizeStartSize = useRef<Size | null>(null)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Block surface pan.
      e.stopPropagation()
      if (e.button !== 0 && e.pointerType === 'mouse') return
      dragPointerId.current = e.pointerId
      dragLastScreen.current = { x: e.clientX, y: e.clientY }
      dragPosition.current = position
      movedDuringGesture.current = false
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch (_error) {
        // setPointerCapture throws in jsdom; drag still works without exclusive capture.
      }
    },
    [position],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragPointerId.current !== e.pointerId) return
      const last = dragLastScreen.current
      if (!last) return
      const zoom = readSurfaceZoom(e.currentTarget) || 1
      const dx = (e.clientX - last.x) / zoom
      const dy = (e.clientY - last.y) / zoom
      if (dx === 0 && dy === 0) return
      dragLastScreen.current = { x: e.clientX, y: e.clientY }
      const next: Point = {
        x: dragPosition.current.x + dx,
        y: dragPosition.current.y + dy,
      }
      const start = !movedDuringGesture.current
      movedDuringGesture.current = true
      dragPosition.current = next
      onDrag?.({
        position: next,
        delta: { x: dx, y: dy },
        start,
        end: false,
      })
    },
    [onDrag],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragPointerId.current !== e.pointerId) return
      dragPointerId.current = null
      dragLastScreen.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch (_error) {
        // releasePointerCapture throws in jsdom; safe to ignore — capture was never held.
      }
      if (movedDuringGesture.current) {
        onDrag?.({
          position: dragPosition.current,
          delta: { x: 0, y: 0 },
          start: false,
          end: true,
        })
      } else {
        onSelect?.(id, e)
      }
      movedDuringGesture.current = false
    },
    [id, onDrag, onSelect],
  )

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      if (!onResize || !size) return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      resizePointerId.current = e.pointerId
      resizeStartScreen.current = { x: e.clientX, y: e.clientY }
      resizeStartSize.current = { ...size }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch (_error) {
        // setPointerCapture throws in jsdom; resize still works without exclusive capture.
      }
    },
    [onResize, size],
  )

  const onResizePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (resizePointerId.current !== e.pointerId) return
      if (!onResize) return
      const start = resizeStartScreen.current
      const startSize = resizeStartSize.current
      if (!start || !startSize) return
      const zoom = readSurfaceZoom(e.currentTarget) || 1
      const dx = (e.clientX - start.x) / zoom
      const dy = (e.clientY - start.y) / zoom
      onResize({
        position,
        size: {
          width: Math.max(0, startSize.width + dx),
          height: Math.max(0, startSize.height + dy),
        },
        end: false,
      })
    },
    [onResize, position],
  )

  const onResizePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (resizePointerId.current !== e.pointerId) return
      resizePointerId.current = null
      const startSize = resizeStartSize.current
      resizeStartScreen.current = null
      resizeStartSize.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch (_error) {
        // releasePointerCapture throws in jsdom; safe to ignore — capture was never held.
      }
      if (onResize && startSize) {
        onResize({
          position,
          size: size ?? startSize,
          end: true,
        })
      }
    },
    [onResize, position, size],
  )

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size?.width,
    height: size?.height,
    touchAction: 'none',
  }

  const handleStyle: CSSProperties = {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    cursor: 'se-resize',
    touchAction: 'none',
  }

  const resolvedAriaLabel = ariaLabel ?? t('canvas.aria.node', {}, { defaultValue: 'Canvas node' })
  const resolvedHandleAriaLabel = t('canvas.aria.resizeHandle', {}, { defaultValue: 'Resize node' })

  return (
    <div
      role="group"
      aria-label={resolvedAriaLabel}
      aria-selected={selected ? 'true' : undefined}
      data-mol-id={id ? `canvas-node-${id}` : 'canvas-node'}
      data-canvas-node-id={id}
      data-selected={selected ? 'true' : undefined}
      className={cm.cn(cm.position('absolute'), className)}
      style={wrapperStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
      {onResize && size ? (
        <div
          role="button"
          aria-label={resolvedHandleAriaLabel}
          data-mol-id={id ? `canvas-node-resize-handle-${id}` : 'canvas-node-resize-handle'}
          style={handleStyle}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        />
      ) : null}
    </div>
  )
}
