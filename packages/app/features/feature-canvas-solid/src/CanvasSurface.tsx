import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCanvasViewport } from './hooks.js'
import type { CanvasSurfaceProps } from './types.js'

/**
 * Pan/zoom container — the shared base every canvas variant builds on.
 *
 * Wheel scroll zooms around the cursor; primary-button drag on the
 * empty surface pans; children render inside a CSS-transformed inner
 * layer so they live in canvas-coordinate-space (use
 * `screenToCanvas` / `canvasToScreen` to translate as needed).
 *
 * Children that handle their own pointer gestures (e.g.
 * `<CanvasNode>`) should call `e.stopPropagation()` on pointerdown to
 * suppress surface pan.
 *
 * This is the Solid counterpart of `@molecule/app-feature-canvas-react`'s
 * `<CanvasSurface>`: the same props (React names) and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link CanvasSurfaceProps}).
 * @returns The rendered canvas surface.
 */
export const CanvasSurface: Component<CanvasSurfaceProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Not destructured: Solid getters must be read inside the JSX effect.
  const canvas = useCanvasViewport(() => ({
    initial: props.initialViewport,
    limits: props.limits,
    value: props.viewport,
    onChange: props.onViewportChange,
  }))

  // The root element, for the wheel's cursor-relative focal point.
  let rootEl: HTMLDivElement | undefined
  // Pointer id of the active pan gesture (null = no active pan).
  let panPointerId: number | null = null
  // Last screen-space position seen during the active pan, so each tick's
  // delta comes from the events themselves, never from `movementX`.
  let lastScreen: { x: number; y: number } | null = null

  const onPointerDown = (e: PointerEvent): void => {
    // Only react to gestures on the surface itself, not on children.
    if (e.target !== e.currentTarget) return
    props.onBackgroundPointerDown?.(e)
    if (props.panOnDrag === false) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    panPointerId = e.pointerId
    lastScreen = { x: e.clientX, y: e.clientY }
    try {
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    } catch (_error) {
      // setPointerCapture throws in jsdom; the pan still works without it.
    }
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (panPointerId !== e.pointerId) return
    const last = lastScreen
    if (!last) return
    const dx = e.clientX - last.x
    const dy = e.clientY - last.y
    lastScreen = { x: e.clientX, y: e.clientY }
    canvas.panBy(dx, dy)
  }

  const endPan = (e: PointerEvent): void => {
    if (panPointerId !== e.pointerId) return
    panPointerId = null
    lastScreen = null
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch (_error) {
      // releasePointerCapture throws in jsdom; capture was never held there.
    }
  }

  const onWheel = (e: WheelEvent): void => {
    const rect = rootEl?.getBoundingClientRect()
    if (!rect) return
    const focalX = e.clientX - rect.left
    const focalY = e.clientY - rect.top
    const factor = e.deltaY < 0 ? (props.zoomFactor ?? 1.1) : 1 / (props.zoomFactor ?? 1.1)
    canvas.zoomBy(factor, focalX, focalY)
  }

  const resolvedAriaLabel = (): string =>
    props.ariaLabel ?? t('canvas.aria.surface', {}, { defaultValue: 'Canvas surface' })

  return (
    <div
      ref={(element) => {
        rootEl = element
      }}
      role="application"
      aria-label={resolvedAriaLabel()}
      data-mol-id="canvas-surface"
      class={cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        'touch-action': 'none',
        width: `${props.width}px`,
        height: `${props.height}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onWheel={onWheel}
    >
      <div
        data-mol-id="canvas-surface-inner"
        data-canvas-zoom={canvas.viewport.zoom}
        data-canvas-x={canvas.viewport.x}
        data-canvas-y={canvas.viewport.y}
        style={{
          position: 'absolute',
          top: '0px',
          left: '0px',
          'transform-origin': '0 0',
          transform: `scale(${canvas.viewport.zoom}) translate(${-canvas.viewport.x}px, ${-canvas.viewport.y}px)`,
          width: '0px',
          height: '0px',
        }}
      >
        {props.children}
      </div>
    </div>
  )
}
