import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent } from 'react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A two-dimensional offset, in CSS pixels, applied to the rendered image
 * relative to the centre of the canvas. Positive `x` shifts the image
 * right; positive `y` shifts it down.
 */
export interface PanOffset {
  /** Horizontal offset, in CSS pixels. */
  x: number
  /** Vertical offset, in CSS pixels. */
  y: number
}

/**
 * Filter parameters applied to the source image before it is rendered to
 * the canvas. Every field is optional — omitted fields disable that
 * filter. Values are clamped at compose time so out-of-range numbers are
 * safe.
 *
 * Implementation note: composition uses the Canvas2D `filter` property
 * (CSS `<filter-function>` syntax). Compose order is preserved.
 */
export interface ImageCanvasFilters {
  /**
   * Brightness multiplier. `1` is identity, `0` is black, `2` is twice
   * as bright. Values < 0 are clamped to 0.
   */
  brightness?: number
  /**
   * Contrast multiplier. `1` is identity, `0` is fully grey, `2` is
   * twice the contrast. Values < 0 are clamped to 0.
   */
  contrast?: number
  /**
   * Saturation multiplier. `1` is identity, `0` is grayscale, `2` is
   * twice as saturated. Values < 0 are clamped to 0.
   */
  saturation?: number
  /**
   * Hue rotation in degrees. Normalised modulo 360 — any finite value
   * is accepted.
   */
  hue?: number
  /**
   * Sepia amount in `[0, 1]`. `0` disables; `1` applies fully. Values
   * outside the range are clamped.
   */
  sepia?: number
  /**
   * Grayscale amount in `[0, 1]`. `0` disables; `1` applies fully.
   * Values outside the range are clamped.
   */
  grayscale?: number
  /**
   * Gaussian blur radius in CSS pixels. `0` disables. Negative values
   * are clamped to 0.
   */
  blur?: number
  /**
   * Sharpen strength in `[0, 1]`. Approximated as a negative-blur
   * contrast bump using the CSS `contrast()` filter; `0` disables.
   * Values outside the range are clamped.
   */
  sharpen?: number
}

/**
 * Imperative export handle exposed via `exportRef`. Callers use this to
 * grab the current rendered image (with all filters, zoom, and pan
 * baked in) as a data URL.
 */
export interface ImageCanvasExportHandle {
  /**
   * Snapshot the current canvas as a data URL.
   *
   * @param type - Image MIME type. Defaults to `image/png`.
   * @param quality - Lossy quality in `[0, 1]` for `image/jpeg` /
   *   `image/webp`. Ignored for `image/png`.
   * @returns A data URL string, or an empty string if the canvas is not
   *   yet mounted.
   */
  toDataURL: (type?: string, quality?: number) => string
}

/** ImageCanvas component props. */
export interface ImageCanvasProps {
  /**
   * Image source. Either a string (URL or data URL) — which the
   * component loads into an internal `HTMLImageElement` — or an
   * already-loaded `HTMLImageElement` the caller manages.
   */
  src: string | HTMLImageElement
  /** Filter chain applied to the rendered image. */
  filters?: ImageCanvasFilters
  /**
   * Zoom factor. `1` is identity. Values <= 0 fall back to `1`.
   * Defaults to `1`.
   */
  zoom?: number
  /**
   * Pan offset in CSS pixels relative to the centre of the canvas.
   * Defaults to `{ x: 0, y: 0 }`.
   */
  pan?: PanOffset
  /**
   * Optional callback fired when the user pans or zooms the canvas.
   * Use this for controlled-component patterns.
   */
  onChange?: (next: { zoom: number; pan: PanOffset }) => void
  /**
   * Imperative handle exposing `toDataURL()` for the caller to grab
   * the rendered result.
   */
  exportRef?: React.Ref<ImageCanvasExportHandle>
  /** Pixel width of the canvas. Defaults to `512`. */
  width?: number
  /** Pixel height of the canvas. Defaults to `512`. */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string
}

/**
 * Clamp a numeric value into the closed interval `[min, max]`. Returns
 * `min` for non-finite inputs.
 *
 * @param value - The value to clamp.
 * @param min - Inclusive minimum.
 * @param max - Inclusive maximum.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Compose a CSS filter string from a set of `ImageCanvasFilters` values.
 * Out-of-range values are clamped; omitted / non-finite fields are
 * ignored. Returns `'none'` when no filters are active so callers can
 * assign the result directly to `CanvasRenderingContext2D.filter`.
 *
 * @param filters - The filter parameters. May be `undefined`.
 * @returns A CSS filter string, or `'none'` when nothing applies.
 */
export function composeFilterString(filters?: ImageCanvasFilters): string {
  if (!filters) return 'none'
  const parts: string[] = []

  if (filters.brightness !== undefined && Number.isFinite(filters.brightness)) {
    const v = Math.max(0, filters.brightness)
    if (v !== 1) parts.push(`brightness(${v})`)
  }
  if (filters.contrast !== undefined && Number.isFinite(filters.contrast)) {
    const v = Math.max(0, filters.contrast)
    if (v !== 1) parts.push(`contrast(${v})`)
  }
  if (filters.saturation !== undefined && Number.isFinite(filters.saturation)) {
    const v = Math.max(0, filters.saturation)
    if (v !== 1) parts.push(`saturate(${v})`)
  }
  if (filters.hue !== undefined && Number.isFinite(filters.hue)) {
    const v = ((filters.hue % 360) + 360) % 360
    if (v !== 0) parts.push(`hue-rotate(${v}deg)`)
  }
  if (filters.sepia !== undefined && Number.isFinite(filters.sepia)) {
    const v = clamp(filters.sepia, 0, 1)
    if (v > 0) parts.push(`sepia(${v})`)
  }
  if (filters.grayscale !== undefined && Number.isFinite(filters.grayscale)) {
    const v = clamp(filters.grayscale, 0, 1)
    if (v > 0) parts.push(`grayscale(${v})`)
  }
  if (filters.blur !== undefined && Number.isFinite(filters.blur)) {
    const v = Math.max(0, filters.blur)
    if (v > 0) parts.push(`blur(${v}px)`)
  }
  if (filters.sharpen !== undefined && Number.isFinite(filters.sharpen)) {
    const v = clamp(filters.sharpen, 0, 1)
    // Approximate sharpen as a small contrast bump. 1.0 = +50% contrast.
    if (v > 0) parts.push(`contrast(${1 + 0.5 * v})`)
  }

  return parts.length === 0 ? 'none' : parts.join(' ')
}

/**
 * Convert a screen-space (canvas-relative) point into image-space
 * coordinates given the current zoom + pan and the source image
 * dimensions. Useful for tools that need to know which image pixel a
 * pointer event hit (cropping, picking, masking).
 *
 * @param point - The canvas-space point in CSS pixels (origin top-left
 *   of the canvas element).
 * @param canvasSize - The canvas size in CSS pixels.
 * @param imageSize - The source image's natural size in pixels.
 * @param zoom - The current zoom factor. Non-positive values fall back
 *   to `1`.
 * @param pan - The current pan offset in CSS pixels.
 * @returns The corresponding point in image-space coordinates.
 */
export function screenToCanvas(
  point: { x: number; y: number },
  canvasSize: { width: number; height: number },
  imageSize: { width: number; height: number },
  zoom: number,
  pan: PanOffset,
): { x: number; y: number } {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  // The image is drawn centred at (cx + pan.x, cy + pan.y) and scaled by
  // `safeZoom` from its natural size. Inverting that mapping yields the
  // image-space pixel for an arbitrary canvas-space point.
  const dx = point.x - cx - pan.x
  const dy = point.y - cy - pan.y
  return {
    x: dx / safeZoom + imageSize.width / 2,
    y: dy / safeZoom + imageSize.height / 2,
  }
}

/**
 * Clamp a pan offset so the (zoomed) image cannot be dragged entirely
 * off-canvas. The clamp keeps at least half of the image visible in
 * each axis. Non-finite inputs are treated as `0`.
 *
 * @param pan - The desired pan offset, in CSS pixels.
 * @param canvasSize - The canvas size in CSS pixels.
 * @param imageSize - The source image's natural size in pixels.
 * @param zoom - The current zoom factor. Non-positive values fall back
 *   to `1`.
 * @returns The clamped pan offset.
 */
export function clampPan(
  pan: PanOffset,
  canvasSize: { width: number; height: number },
  imageSize: { width: number; height: number },
  zoom: number,
): PanOffset {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const halfImgW = (imageSize.width * safeZoom) / 2
  const halfImgH = (imageSize.height * safeZoom) / 2
  const halfCanvasW = canvasSize.width / 2
  const halfCanvasH = canvasSize.height / 2
  // Allow the image centre to move up to (halfCanvas + halfImg/2) — i.e.
  // half the image always stays visible.
  const maxX = halfCanvasW + halfImgW / 2
  const maxY = halfCanvasH + halfImgH / 2
  const px = Number.isFinite(pan.x) ? pan.x : 0
  const py = Number.isFinite(pan.y) ? pan.y : 0
  return {
    x: clamp(px, -maxX, maxX),
    y: clamp(py, -maxY, maxY),
  }
}

/**
 * Determine whether a `src` prop is an `HTMLImageElement` instance. We
 * test against the constructor at call time so jsdom's `HTMLImageElement`
 * shim works in tests.
 *
 * @param src - The `src` value to inspect.
 * @returns `true` if `src` is an `HTMLImageElement`.
 */
function isImageElement(src: string | HTMLImageElement): src is HTMLImageElement {
  if (typeof src === 'string') return false
  if (typeof HTMLImageElement === 'undefined') return false
  return src instanceof HTMLImageElement
}

/**
 * Canvas2D image-editing surface. Renders a source image onto a canvas
 * with a filter chain (brightness, contrast, saturation, hue, sepia,
 * grayscale, blur, sharpen), pointer-event drag panning, and wheel
 * zooming. The current state can be exported to a data URL via the
 * `exportRef` imperative handle.
 *
 * All styling routes through `getClassMap()` (no Tailwind / raw class
 * names). All user-visible text routes through `t()` so the canvas
 * translates via the companion
 * `@molecule/app-locales-feature-image-canvas` locale bond.
 *
 * @param props - Component props.
 * @param ref - Imperative handle (deprecated; prefer `exportRef`).
 * @returns The image-canvas element.
 */
export const ImageCanvas = forwardRef<ImageCanvasExportHandle, ImageCanvasProps>(
  function ImageCanvas(props, ref) {
    const {
      src,
      filters,
      zoom = 1,
      pan = { x: 0, y: 0 },
      onChange,
      exportRef,
      width = 512,
      height = 512,
      className,
    } = props

    const cm = getClassMap()
    const { t } = useTranslation()

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [internalImage, setInternalImage] = useState<HTMLImageElement | null>(
      isImageElement(src) ? src : null,
    )
    const [loadError, setLoadError] = useState<string | null>(null)

    const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
    const safePan: PanOffset = {
      x: Number.isFinite(pan.x) ? pan.x : 0,
      y: Number.isFinite(pan.y) ? pan.y : 0,
    }

    const filterString = useMemo(() => composeFilterString(filters), [filters])

    // Track drag state in a ref so handlers don't tear down on every render.
    const dragState = useRef<{
      pointerId: number | null
      startX: number
      startY: number
      startPan: PanOffset
    }>({ pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } })

    // Load the source image when the prop is a URL string.
    useEffect(() => {
      if (typeof src !== 'string') {
        if (isImageElement(src)) {
          setInternalImage(src)
          setLoadError(null)
        }
        return
      }

      let cancelled = false
      setLoadError(null)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (cancelled) return
        setInternalImage(img)
      }
      img.onerror = () => {
        if (cancelled) return
        setLoadError(src)
        setInternalImage(null)
      }
      img.src = src

      return () => {
        cancelled = true
      }
    }, [src])

    // Re-paint whenever the image, viewport, or filter chain changes.
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!internalImage) {
        ctx.restore()
        return
      }

      ctx.filter = filterString
      const drawWidth = internalImage.naturalWidth * safeZoom
      const drawHeight = internalImage.naturalHeight * safeZoom
      const dx = canvas.width / 2 - drawWidth / 2 + safePan.x
      const dy = canvas.height / 2 - drawHeight / 2 + safePan.y
      ctx.drawImage(internalImage, dx, dy, drawWidth, drawHeight)
      ctx.restore()
    }, [internalImage, filterString, safeZoom, safePan.x, safePan.y, width, height])

    useImperativeHandle(
      exportRef ?? ref,
      (): ImageCanvasExportHandle => ({
        toDataURL: (type, quality) => {
          const canvas = canvasRef.current
          if (!canvas) return ''
          return canvas.toDataURL(type, quality)
        },
      }),
      [],
    )

    const handlePointerDown = useCallback(
      (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const node = canvasRef.current
        if (!node) return
        node.setPointerCapture(event.pointerId)
        dragState.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startPan: { ...safePan },
        }
      },
      [safePan],
    )

    const handlePointerMove = useCallback(
      (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const state = dragState.current
        if (state.pointerId !== event.pointerId) return
        const dx = event.clientX - state.startX
        const dy = event.clientY - state.startY
        const next = clampPan(
          { x: state.startPan.x + dx, y: state.startPan.y + dy },
          { width, height },
          internalImage
            ? { width: internalImage.naturalWidth, height: internalImage.naturalHeight }
            : { width, height },
          safeZoom,
        )
        onChange?.({ zoom: safeZoom, pan: next })
      },
      [internalImage, onChange, safeZoom, width, height],
    )

    const endDrag = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
      const state = dragState.current
      if (state.pointerId !== event.pointerId) return
      const node = canvasRef.current
      if (node && node.hasPointerCapture(event.pointerId)) {
        node.releasePointerCapture(event.pointerId)
      }
      dragState.current = {
        pointerId: null,
        startX: 0,
        startY: 0,
        startPan: { x: 0, y: 0 },
      }
    }, [])

    const handleWheel = useCallback(
      (event: WheelEvent<HTMLCanvasElement>) => {
        // Negative deltaY = scroll up = zoom in.
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
        const nextZoom = clamp(safeZoom * factor, 0.05, 32)
        onChange?.({ zoom: nextZoom, pan: safePan })
      },
      [onChange, safePan, safeZoom],
    )

    const ariaLabel = t('imageCanvas.aria.region', {}, { defaultValue: 'Image canvas' })
    const dragLabel = t(
      'imageCanvas.aria.canvas',
      {},
      { defaultValue: 'Drag to pan, scroll to zoom' },
    )
    const loadingLabel = t('imageCanvas.loading', {}, { defaultValue: 'Loading image…' })
    const errorLabel = t('imageCanvas.error', {}, { defaultValue: 'Image failed to load.' })

    const containerStyle: CSSProperties = {
      display: 'inline-block',
      width,
      height,
      position: 'relative',
    }

    const canvasStyle: CSSProperties = {
      display: 'block',
      width,
      height,
      cursor: onChange ? 'grab' : 'default',
      touchAction: 'none',
    }

    return (
      <div
        role="region"
        aria-label={ariaLabel}
        data-mol-id="image-canvas"
        className={cm.cn(className)}
        style={containerStyle}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          aria-label={dragLabel}
          data-mol-id="image-canvas-surface"
          data-loading={internalImage ? 'false' : loadError ? 'false' : 'true'}
          data-error={loadError ? 'true' : 'false'}
          style={canvasStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={handleWheel}
        />
        {!internalImage && !loadError ? (
          <p className={cm.cn(cm.textSize('xs'), cm.sp('p', 2))} data-mol-id="image-canvas-loading">
            {loadingLabel}
          </p>
        ) : null}
        {loadError ? (
          <p
            className={cm.cn(cm.textSize('xs'), cm.sp('p', 2))}
            data-mol-id="image-canvas-error"
            role="alert"
          >
            {errorLabel}
          </p>
        ) : null}
      </div>
    )
  },
)
