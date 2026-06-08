import type {
  CSSProperties,
  JSX,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { useCallback, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useCanvasViewport } from './hooks.js'
import type { CanvasViewport, ViewportLimits } from './types.js'

/** `<CanvasSurface>` props. */
export interface CanvasSurfaceProps {
  /**
   * Controlled viewport. If omitted, the surface manages its own
   * viewport state via {@link useCanvasViewport}.
   */
  viewport?: CanvasViewport
  /**
   * Initial viewport (uncontrolled mode only). Ignored when `viewport`
   * is supplied.
   */
  initialViewport?: CanvasViewport
  /**
   * Called whenever the viewport changes (pan, zoom, or external set).
   * Required when `viewport` is supplied (controlled mode).
   */
  onViewportChange?: (next: CanvasViewport) => void
  /** Optional clamping limits applied on every viewport update. */
  limits?: ViewportLimits
  /**
   * Wheel-zoom factor per scroll tick. Multiplied for zoom-in (deltaY < 0)
   * and divided for zoom-out (deltaY > 0). Defaults to `1.1`.
   */
  zoomFactor?: number
  /**
   * If `true`, dragging anywhere on the surface pans (children that
   * stop propagation on pointerdown will still capture their own
   * gestures — the typical pattern for nodes). Defaults to `true`.
   */
  panOnDrag?: boolean
  /**
   * Called when an empty-area pointerdown fires. Useful for clearing
   * selection on background clicks.
   */
  onBackgroundPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
  /** Width of the surface in CSS pixels. */
  width: number
  /** Height of the surface in CSS pixels. */
  height: number
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Children render in canvas-coordinate-space (transformed by viewport). */
  children?: ReactNode
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

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
 * Style is driven entirely by `getClassMap()`; inline styles are
 * reserved for things ClassMap can't express (transforms,
 * touch-action, viewport-derived offsets).
 *
 * @param props - Component props.
 * @returns The canvas surface element.
 * @example
 * ```tsx
 * const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 })
 * <CanvasSurface
 *   viewport={viewport}
 *   onViewportChange={setViewport}
 *   width={800}
 *   height={600}
 * >
 *   <CanvasNode position={{ x: 100, y: 100 }} size={{ width: 80, height: 40 }}>
 *     hello
 *   </CanvasNode>
 * </CanvasSurface>
 * ```
 */
export function CanvasSurface(props: CanvasSurfaceProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    viewport: controlledViewport,
    initialViewport,
    onViewportChange,
    limits,
    zoomFactor = 1.1,
    panOnDrag = true,
    onBackgroundPointerDown,
    width,
    height,
    ariaLabel,
    children,
    className,
  } = props

  const { viewport, panBy, zoomBy } = useCanvasViewport({
    initial: initialViewport,
    limits,
    value: controlledViewport,
    onChange: onViewportChange,
  })

  const rootRef = useRef<HTMLDivElement | null>(null)
  // Pointer-id of the current pan gesture (null = no active pan).
  const panPointerId = useRef<number | null>(null)
  // Last screen-space position seen during the active pan, used to
  // compute per-tick deltas without depending on event movement values.
  const lastScreen = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Only react to gestures on the surface itself, not on children.
      if (e.target !== e.currentTarget) return
      onBackgroundPointerDown?.(e)
      if (!panOnDrag) return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      panPointerId.current = e.pointerId
      lastScreen.current = { x: e.clientX, y: e.clientY }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch (_error) {
        /* setPointerCapture can throw in jsdom; ignore. */
      }
    },
    [panOnDrag, onBackgroundPointerDown],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (panPointerId.current !== e.pointerId) return
      const last = lastScreen.current
      if (!last) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      lastScreen.current = { x: e.clientX, y: e.clientY }
      panBy(dx, dy)
    },
    [panBy],
  )

  const endPan = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (panPointerId.current !== e.pointerId) return
    panPointerId.current = null
    lastScreen.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (_error) {
      /* releasePointerCapture can throw in jsdom; ignore. */
    }
  }, [])

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const focalX = e.clientX - rect.left
      const focalY = e.clientY - rect.top
      const factor = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor
      zoomBy(factor, focalX, focalY)
    },
    [zoomBy, zoomFactor],
  )

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'none',
    width,
    height,
  }

  // The inner layer is transformed so children render in canvas-space.
  // We translate by -viewport then scale by zoom, so canvas-space
  // origin maps to (-viewport.x * zoom, -viewport.y * zoom) on screen.
  const innerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: '0 0',
    transform: `scale(${viewport.zoom}) translate(${-viewport.x}px, ${-viewport.y}px)`,
    width: 0,
    height: 0,
  }

  const resolvedAriaLabel =
    ariaLabel ?? t('canvas.aria.surface', {}, { defaultValue: 'Canvas surface' })

  return (
    <div
      ref={rootRef}
      role="application"
      aria-label={resolvedAriaLabel}
      data-mol-id="canvas-surface"
      className={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
      style={wrapperStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onWheel={onWheel}
    >
      <div
        data-mol-id="canvas-surface-inner"
        data-canvas-zoom={viewport.zoom}
        data-canvas-x={viewport.x}
        data-canvas-y={viewport.y}
        style={innerStyle}
      >
        {children}
      </div>
    </div>
  )
}
