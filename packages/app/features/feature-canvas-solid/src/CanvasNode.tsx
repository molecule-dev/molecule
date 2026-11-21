import { type Component, createUniqueId, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { CanvasNodeProps, Point, Size } from './types.js'

/**
 * Read the canvas zoom from the nearest surface ancestor (defaults to 1).
 *
 * @param el - The element the gesture runs on.
 * @returns The surface zoom, or 1 when no ancestor carries one.
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
 * Accessibility: the base renders as `role="group"` named by `aria-label`.
 * `aria-selected` is not valid on a group, and the selectable roles
 * (`option`, `gridcell`, `treeitem`) need a listbox, grid or tree parent the
 * `role="application"` surface is not; `option` would also flatten the
 * resize handle button. A selected node is therefore described by a hidden
 * "Selected" text through `aria-describedby`.
 *
 * This is the Solid counterpart of `@molecule/app-feature-canvas-react`'s
 * `<CanvasNode>`: the same props (React names) and the same DOM for the same
 * input.
 *
 * @param props - Component props (see {@link CanvasNodeProps}).
 * @returns The rendered canvas node.
 */
export const CanvasNode: Component<CanvasNodeProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Drag gesture state.
  let dragPointerId: number | null = null
  let dragLastScreen: { x: number; y: number } | null = null
  let dragPosition: Point = props.position
  let movedDuringGesture = false

  // Resize gesture state.
  let resizePointerId: number | null = null
  let resizeStartScreen: { x: number; y: number } | null = null
  let resizeStartSize: Size | null = null

  const onPointerDown = (e: PointerEvent): void => {
    // Block surface pan.
    e.stopPropagation()
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragPointerId = e.pointerId
    dragLastScreen = { x: e.clientX, y: e.clientY }
    dragPosition = props.position
    movedDuringGesture = false
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the drag still works without it.
    }
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (dragPointerId !== e.pointerId) return
    const last = dragLastScreen
    if (!last) return
    const zoom = readSurfaceZoom(e.currentTarget as Element) || 1
    const dx = (e.clientX - last.x) / zoom
    const dy = (e.clientY - last.y) / zoom
    if (dx === 0 && dy === 0) return
    dragLastScreen = { x: e.clientX, y: e.clientY }
    const next: Point = { x: dragPosition.x + dx, y: dragPosition.y + dy }
    const start = !movedDuringGesture
    movedDuringGesture = true
    dragPosition = next
    props.onDrag?.({ position: next, delta: { x: dx, y: dy }, start, end: false })
  }

  const onPointerUp = (e: PointerEvent): void => {
    if (dragPointerId !== e.pointerId) return
    dragPointerId = null
    dragLastScreen = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
    if (movedDuringGesture) {
      props.onDrag?.({
        position: dragPosition,
        delta: { x: 0, y: 0 },
        start: false,
        end: true,
      })
    } else {
      props.onSelect?.(props.id, e)
    }
    movedDuringGesture = false
  }

  const onResizePointerDown = (e: PointerEvent): void => {
    e.stopPropagation()
    const current = props.size
    if (!props.onResize || !current) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    resizePointerId = e.pointerId
    resizeStartScreen = { x: e.clientX, y: e.clientY }
    resizeStartSize = { width: current.width, height: current.height }
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the resize still works without it.
    }
  }

  const onResizePointerMove = (e: PointerEvent): void => {
    if (resizePointerId !== e.pointerId) return
    const onResize = props.onResize
    if (!onResize) return
    const start = resizeStartScreen
    const startSize = resizeStartSize
    if (!start || !startSize) return
    const zoom = readSurfaceZoom(e.currentTarget as Element) || 1
    const dx = (e.clientX - start.x) / zoom
    const dy = (e.clientY - start.y) / zoom
    onResize({
      position: props.position,
      size: {
        width: Math.max(0, startSize.width + dx),
        height: Math.max(0, startSize.height + dy),
      },
      end: false,
    })
  }

  const onResizePointerUp = (e: PointerEvent): void => {
    if (resizePointerId !== e.pointerId) return
    resizePointerId = null
    const startSize = resizeStartSize
    resizeStartScreen = null
    resizeStartSize = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
    const onResize = props.onResize
    if (onResize && startSize) {
      onResize({
        position: props.position,
        size: props.size ?? startSize,
        end: true,
      })
    }
  }

  const selectedDescriptionId = createUniqueId()

  const wrapperStyle = (): string => {
    let style = `position: absolute; left: ${props.position.x}px; top: ${props.position.y}px;`
    if (props.size) style += ` width: ${props.size.width}px; height: ${props.size.height}px;`
    return `${style} touch-action: none`
  }

  const handleStyle =
    'position: absolute; right: 0px; bottom: 0px; width: 12px; height: 12px; cursor: se-resize; touch-action: none'

  const resolvedAriaLabel = (): string =>
    props.ariaLabel ?? t('canvas.aria.node', {}, { defaultValue: 'Canvas node' })
  const resolvedHandleAriaLabel = (): string =>
    t('canvas.aria.resizeHandle', {}, { defaultValue: 'Resize node' })

  return (
    <div
      role="group"
      aria-label={resolvedAriaLabel()}
      aria-describedby={props.selected ? selectedDescriptionId : undefined}
      data-mol-id={props.id ? `canvas-node-${props.id}` : 'canvas-node'}
      data-canvas-node-id={props.id}
      data-selected={props.selected ? 'true' : undefined}
      class={cm.cn(cm.position('absolute'), props.className)}
      style={wrapperStyle()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {props.children}
      <Show when={props.selected}>
        <span id={selectedDescriptionId} hidden>
          {t('canvas.aria.nodeSelected', {}, { defaultValue: 'Selected' })}
        </span>
      </Show>
      <Show when={props.onResize && props.size}>
        <div
          role="button"
          aria-label={resolvedHandleAriaLabel()}
          data-mol-id={
            props.id ? `canvas-node-resize-handle-${props.id}` : 'canvas-node-resize-handle'
          }
          style={handleStyle}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        />
      </Show>
    </div>
  )
}
