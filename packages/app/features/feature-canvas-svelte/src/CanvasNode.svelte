<!--
  CanvasNode: the Svelte counterpart of `@molecule/app-feature-canvas-react`'s
  `<CanvasNode>` — generic positioned + draggable + resizable wrapper that
  renders into the canvas-coordinate-space layer of `<CanvasSurface>`. Same
  props (React names), same DOM.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { CanvasNodeProps, Point, Size } from './types.js'

  let {
    id,
    position,
    size,
    selected = false,
    onSelect,
    onDrag,
    onResize,
    ariaLabel,
    className,
    children,
  }: CanvasNodeProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Reads the canvas zoom from the nearest surface ancestor (defaults to 1).
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

  // Drag gesture state.
  let dragPointerId: number | null = null
  let dragLastScreen: { x: number; y: number } | null = null
  let dragPosition: Point = untrack(() => position)
  let movedDuringGesture = false

  // Resize gesture state.
  let resizePointerId: number | null = null
  let resizeStartScreen: { x: number; y: number } | null = null
  let resizeStartSize: Size | null = null

  const selectedDescriptionId = $props.id()

  const wrapperStyle = $derived(
    `position: absolute; left: ${position.x}px; top: ${position.y}px;${size ? ` width: ${size.width}px; height: ${size.height}px;` : ''} touch-action: none`,
  )
  const handleStyle =
    'position: absolute; right: 0px; bottom: 0px; width: 12px; height: 12px; cursor: se-resize; touch-action: none'

  const resolvedAriaLabel = $derived(
    ariaLabel ?? t('canvas.aria.node', {}, { defaultValue: 'Canvas node' }),
  )
  const resolvedHandleAriaLabel = $derived(
    t('canvas.aria.resizeHandle', {}, { defaultValue: 'Resize node' }),
  )

  /**
   * Starts a drag gesture (or a selection press) on the node body.
   *
   * @param event - The pointer event.
   */
  function onPointerDown(event: PointerEvent): void {
    // Block surface pan.
    event.stopPropagation()
    if (event.button !== 0 && event.pointerType === 'mouse') return
    dragPointerId = event.pointerId
    dragLastScreen = { x: event.clientX, y: event.clientY }
    dragPosition = position
    movedDuringGesture = false
    try {
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the drag still works without it.
    }
  }

  /**
   * Reports each drag tick in canvas-space.
   *
   * @param event - The pointer event.
   */
  function onPointerMove(event: PointerEvent): void {
    if (dragPointerId !== event.pointerId) return
    const last = dragLastScreen
    if (!last) return
    const zoom = readSurfaceZoom(event.currentTarget as Element) || 1
    const dx = (event.clientX - last.x) / zoom
    const dy = (event.clientY - last.y) / zoom
    if (dx === 0 && dy === 0) return
    dragLastScreen = { x: event.clientX, y: event.clientY }
    const next: Point = { x: dragPosition.x + dx, y: dragPosition.y + dy }
    const start = !movedDuringGesture
    movedDuringGesture = true
    dragPosition = next
    onDrag?.({ position: next, delta: { x: dx, y: dy }, start, end: false })
  }

  /**
   * Ends the drag: reports the final delta, or selects the node when the
   * gesture never moved.
   *
   * @param event - The pointer event.
   */
  function onPointerUp(event: PointerEvent): void {
    if (dragPointerId !== event.pointerId) return
    dragPointerId = null
    dragLastScreen = null
    try {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
    if (movedDuringGesture) {
      onDrag?.({ position: dragPosition, delta: { x: 0, y: 0 }, start: false, end: true })
    } else {
      onSelect?.(id, event)
    }
    movedDuringGesture = false
  }

  /**
   * Starts a resize gesture from the SE handle.
   *
   * @param event - The pointer event.
   */
  function onResizePointerDown(event: PointerEvent): void {
    event.stopPropagation()
    if (!onResize || !size) return
    if (event.button !== 0 && event.pointerType === 'mouse') return
    resizePointerId = event.pointerId
    resizeStartScreen = { x: event.clientX, y: event.clientY }
    resizeStartSize = { width: size.width, height: size.height }
    try {
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the resize still works without it.
    }
  }

  /**
   * Reports each resize tick in canvas-space.
   *
   * @param event - The pointer event.
   */
  function onResizePointerMove(event: PointerEvent): void {
    if (resizePointerId !== event.pointerId) return
    if (!onResize) return
    const start = resizeStartScreen
    const startSize = resizeStartSize
    if (!start || !startSize) return
    const zoom = readSurfaceZoom(event.currentTarget as Element) || 1
    const dx = (event.clientX - start.x) / zoom
    const dy = (event.clientY - start.y) / zoom
    onResize({
      position,
      size: {
        width: Math.max(0, startSize.width + dx),
        height: Math.max(0, startSize.height + dy),
      },
      end: false,
    })
  }

  /**
   * Ends the resize gesture.
   *
   * @param event - The pointer event.
   */
  function onResizePointerUp(event: PointerEvent): void {
    if (resizePointerId !== event.pointerId) return
    resizePointerId = null
    const startSize = resizeStartSize
    resizeStartScreen = null
    resizeStartSize = null
    try {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
    if (onResize && startSize) onResize({ position, size: size ?? startSize, end: true })
  }
</script>

<div
  role="group"
  aria-label={resolvedAriaLabel}
  aria-describedby={selected ? selectedDescriptionId : undefined}
  data-mol-id={id ? `canvas-node-${id}` : 'canvas-node'}
  data-canvas-node-id={id}
  data-selected={selected ? 'true' : undefined}
  class={cm.cn(cm.position('absolute'), className)}
  style={wrapperStyle}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  {#if children}{@render children()}{/if}
  {#if selected}
    <span id={selectedDescriptionId} hidden>
      {t('canvas.aria.nodeSelected', {}, { defaultValue: 'Selected' })}
    </span>
  {/if}
  {#if onResize && size}
    <!-- React's handle is a div with role="button" and no tabindex; keep the DOM identical. -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      role="button"
      aria-label={resolvedHandleAriaLabel}
      data-mol-id={id ? `canvas-node-resize-handle-${id}` : 'canvas-node-resize-handle'}
      style={handleStyle}
      onpointerdown={onResizePointerDown}
      onpointermove={onResizePointerMove}
      onpointerup={onResizePointerUp}
      onpointercancel={onResizePointerUp}
    ></div>
  {/if}
</div>
