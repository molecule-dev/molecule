/**
 * Solid Canvas2D image-editing surface — a filter chain, pointer-drag
 * panning, wheel zooming and a data-URL export handle.
 *
 * Solid counterpart of `@molecule/app-feature-image-canvas-react`'s
 * `ImageCanvas` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { clamp, clampPan, composeFilterString } from './helpers.js'
import { isImageElement } from './image-source.js'
import type { ImageCanvasProps, PanOffset } from './types.js'

/**
 * Canvas2D image-editing surface. Renders a source image onto a canvas with a
 * filter chain (brightness, contrast, saturation, hue, sepia, grayscale, blur,
 * sharpen), pointer-event drag panning, and wheel zooming. The current state
 * can be exported to a data URL via the `exportRef` imperative handle.
 *
 * All styling routes through `getClassMap()` (no raw class names). All
 * user-visible text routes through `t()` so the canvas translates via the
 * companion locale bond.
 *
 * @param props - Component props (see {@link ImageCanvasProps}).
 * @returns The rendered image canvas.
 */
export const ImageCanvas: Component<ImageCanvasProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  let canvas: HTMLCanvasElement | undefined
  const [internalImage, setInternalImage] = createSignal<HTMLImageElement | null>(
    isImageElement(props.src) ? props.src : null,
  )
  const [loadError, setLoadError] = createSignal<string | null>(null)

  const width = (): number => props.width ?? 512
  const height = (): number => props.height ?? 512
  const safeZoom = (): number => {
    const zoom = props.zoom
    return zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  }
  const safePan = (): PanOffset => ({
    x: Number.isFinite(props.pan?.x) ? (props.pan?.x as number) : 0,
    y: Number.isFinite(props.pan?.y) ? (props.pan?.y as number) : 0,
  })
  const filterString = createMemo(() => composeFilterString(props.filters))

  // Drag state lives outside signals: handlers mutate it without re-rendering,
  // exactly like React's ref.
  let dragState: {
    pointerId: number | null
    startX: number
    startY: number
    startPan: PanOffset
  } = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }

  // Load the source image when the prop is a URL string.
  createEffect(() => {
    const src = props.src
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

    onCleanup(() => {
      cancelled = true
    })
  })

  // Re-paint whenever the image, viewport, or filter chain changes.
  createEffect(() => {
    const image = internalImage()
    const zoom = safeZoom()
    const pan = safePan()
    const filter = filterString()
    const canvasWidth = width()
    const canvasHeight = height()
    const node = canvas
    if (!node) return

    const ctx = node.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    if (!image) {
      ctx.restore()
      return
    }

    ctx.filter = filter
    const drawWidth = image.naturalWidth * zoom
    const drawHeight = image.naturalHeight * zoom
    const dx = canvasWidth / 2 - drawWidth / 2 + pan.x
    const dy = canvasHeight / 2 - drawHeight / 2 + pan.y
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
    ctx.restore()
  })

  onMount(() => {
    if (!props.exportRef) return
    props.exportRef.current = {
      toDataURL: (type, quality) => {
        if (!canvas) return ''
        return canvas.toDataURL(type, quality)
      },
    }
  })

  onCleanup(() => {
    if (props.exportRef) props.exportRef.current = null
  })

  const handlePointerDown = (event: PointerEvent): void => {
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: { ...safePan() },
    }
  }

  const handlePointerMove = (event: PointerEvent): void => {
    const state = dragState
    if (state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    const image = internalImage()
    const next = clampPan(
      { x: state.startPan.x + dx, y: state.startPan.y + dy },
      { width: width(), height: height() },
      image
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: width(), height: height() },
      safeZoom(),
    )
    props.onChange?.({ zoom: safeZoom(), pan: next })
  }

  const endDrag = (event: PointerEvent): void => {
    const state = dragState
    if (state.pointerId !== event.pointerId) return
    if (canvas && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    dragState = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }
  }

  const handleWheel = (event: WheelEvent): void => {
    // Negative deltaY = scroll up = zoom in.
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    const nextZoom = clamp(safeZoom() * factor, 0.05, 32)
    props.onChange?.({ zoom: nextZoom, pan: safePan() })
  }

  return (
    <div
      role="region"
      aria-label={t('imageCanvas.aria.region', {}, { defaultValue: 'Image canvas' })}
      data-mol-id="image-canvas"
      class={cm.cn(props.className)}
      style={{
        display: 'inline-block',
        width: `${width()}px`,
        height: `${height()}px`,
        position: 'relative',
      }}
    >
      <canvas
        ref={(element) => {
          canvas = element
        }}
        width={width()}
        height={height()}
        aria-label={t(
          'imageCanvas.aria.canvas',
          {},
          { defaultValue: 'Drag to pan, scroll to zoom' },
        )}
        data-mol-id="image-canvas-surface"
        data-loading={internalImage() ? 'false' : loadError() ? 'false' : 'true'}
        data-error={loadError() ? 'true' : 'false'}
        style={{
          display: 'block',
          width: `${width()}px`,
          height: `${height()}px`,
          cursor: props.onChange ? 'grab' : 'default',
          'touch-action': 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={handleWheel}
      />
      {!internalImage() && !loadError() ? (
        <p class={cm.cn(cm.textSize('xs'), cm.sp('p', 2))} data-mol-id="image-canvas-loading">
          {t('imageCanvas.loading', {}, { defaultValue: 'Loading image…' })}
        </p>
      ) : null}
      {loadError() ? (
        <p
          class={cm.cn(cm.textSize('xs'), cm.sp('p', 2))}
          data-mol-id="image-canvas-error"
          role="alert"
        >
          {t('imageCanvas.error', {}, { defaultValue: 'Image failed to load.' })}
        </p>
      ) : null}
    </div>
  )
}
