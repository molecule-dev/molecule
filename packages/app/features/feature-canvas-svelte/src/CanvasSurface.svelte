<!--
  CanvasSurface: the Svelte counterpart of `@molecule/app-feature-canvas-react`'s
  `<CanvasSurface>` — pan/zoom container whose children render in
  canvas-coordinate-space. Wheel scroll zooms around the cursor; primary-button
  drag on the empty surface pans. Same props (React names), same DOM.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { clampViewport } from './coordinates.js'
  import type { CanvasSurfaceProps, CanvasViewport } from './types.js'

  let {
    viewport,
    initialViewport,
    onViewportChange,
    limits,
    zoomFactor = 1.1,
    panOnDrag = true,
    onBackgroundPointerDown,
    width,
    height,
    ariaLabel,
    className,
    children,
  }: CanvasSurfaceProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // React's `useState` seed: the initial viewport is read once, so a later
  // `initialViewport` prop never resets an uncontrolled viewport.
  let internal = $state<CanvasViewport>(untrack(() => initialViewport ?? { x: 0, y: 0, zoom: 1 }))
  const current = $derived(viewport ?? internal)

  const resolvedAriaLabel = $derived(
    ariaLabel ?? t('canvas.aria.surface', {}, { defaultValue: 'Canvas surface' }),
  )

  const wrapperStyle = $derived(
    `position: relative; overflow: hidden; touch-action: none; width: ${width}px; height: ${height}px`,
  )
  // The inner layer is transformed so children render in canvas-space: the
  // canvas-space origin maps to (-viewport.x * zoom, -viewport.y * zoom).
  const innerStyle = $derived(
    `position: absolute; top: 0px; left: 0px; transform-origin: 0 0; transform: scale(${current.zoom}) translate(${-current.x}px, ${-current.y}px); width: 0px; height: 0px`,
  )

  // The root element, for the wheel's cursor-relative focal point.
  let rootEl: HTMLDivElement

  // Pointer id of the active pan gesture (null = no active pan).
  let panPointerId: number | null = null
  // Last screen-space position seen during the active pan.
  let lastScreen: { x: number; y: number } | null = null

  /**
   * Replaces the viewport (clamped), reports it, and keeps it when
   * uncontrolled.
   *
   * @param next - The desired viewport.
   */
  function setViewport(next: CanvasViewport): void {
    const clamped = clampViewport(next, limits)
    onViewportChange?.(clamped)
    if (viewport === undefined) internal = clamped
  }

  /**
   * Pans by a screen-space delta, interpreted through the current zoom.
   *
   * @param deltaX - Screen-space x delta.
   * @param deltaY - Screen-space y delta.
   */
  function panBy(deltaX: number, deltaY: number): void {
    const vp = current
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    setViewport({
      x: vp.x - deltaX / safeZoom,
      y: vp.y - deltaY / safeZoom,
      zoom: vp.zoom,
    })
  }

  /**
   * Zooms around a screen-space focal point, holding its canvas-space
   * position fixed.
   *
   * @param factor - Zoom multiplier (> 1 zooms in).
   * @param focalScreenX - Focal x in screen space.
   * @param focalScreenY - Focal y in screen space.
   */
  function zoomBy(factor: number, focalScreenX: number, focalScreenY: number): void {
    if (factor <= 0) return
    const vp = current
    const safeZoom = vp.zoom === 0 ? 1 : vp.zoom
    const focalCanvasX = focalScreenX / safeZoom + vp.x
    const focalCanvasY = focalScreenY / safeZoom + vp.y
    const nextZoom = vp.zoom * factor
    setViewport({
      x: focalCanvasX - focalScreenX / nextZoom,
      y: focalCanvasY - focalScreenY / nextZoom,
      zoom: nextZoom,
    })
  }

  /**
   * Handles a surface pointer-down: background callback, then pan.
   *
   * @param event - The pointer event.
   */
  function onPointerDown(event: PointerEvent): void {
    // Only react to gestures on the surface itself, not on children.
    if (event.target !== event.currentTarget) return
    onBackgroundPointerDown?.(event)
    if (!panOnDrag) return
    if (event.button !== 0 && event.pointerType === 'mouse') return
    panPointerId = event.pointerId
    lastScreen = { x: event.clientX, y: event.clientY }
    try {
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the pan still works without it.
    }
  }

  /**
   * Pans by the delta since the previous move of the active gesture.
   *
   * @param event - The pointer event.
   */
  function onPointerMove(event: PointerEvent): void {
    if (panPointerId !== event.pointerId) return
    const last = lastScreen
    if (!last) return
    const dx = event.clientX - last.x
    const dy = event.clientY - last.y
    lastScreen = { x: event.clientX, y: event.clientY }
    panBy(dx, dy)
  }

  /**
   * Ends the active pan gesture (pointer-up or pointer-cancel).
   *
   * @param event - The pointer event.
   */
  function endPan(event: PointerEvent): void {
    if (panPointerId !== event.pointerId) return
    panPointerId = null
    lastScreen = null
    try {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
  }

  /**
   * Zooms around the cursor on a wheel tick.
   *
   * @param event - The wheel event.
   */
  function onWheel(event: WheelEvent): void {
    const rect = rootEl?.getBoundingClientRect()
    if (!rect) return
    const focalX = event.clientX - rect.left
    const focalY = event.clientY - rect.top
    const factor = event.deltaY < 0 ? zoomFactor : 1 / zoomFactor
    zoomBy(factor, focalX, focalY)
  }
</script>

<div
  bind:this={rootEl}
  role="application"
  aria-label={resolvedAriaLabel}
  data-mol-id="canvas-surface"
  class={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
  style={wrapperStyle}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={endPan}
  onpointercancel={endPan}
  onwheel={onWheel}
>
  <div
    data-mol-id="canvas-surface-inner"
    data-canvas-zoom={current.zoom}
    data-canvas-x={current.x}
    data-canvas-y={current.y}
    style={innerStyle}
  >
    {#if children}{@render children()}{/if}
  </div>
</div>
