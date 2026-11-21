<!--
  ImageCanvas: the Svelte counterpart of
  `@molecule/app-feature-image-canvas-react`'s `ImageCanvas` — a source image
  rendered onto a canvas with a filter chain (brightness, contrast,
  saturation, hue, sepia, grayscale, blur, sharpen), pointer-drag panning,
  wheel zooming, and a `toDataURL()` export handle. Same props (React names),
  same DOM for the same input; the `loading` and `error` messages are the
  React package's translated text.
-->
<script lang="ts">
  import { onMount } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { clamp, clampPan, composeFilterString } from './helpers.js'
  import { isImageElement } from './image-source.js'
  import type { ImageCanvasProps, PanOffset } from './types.js'

  let {
    src,
    filters,
    zoom,
    pan,
    onChange,
    exportRef,
    width = 512,
    height = 512,
    className,
  }: ImageCanvasProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let canvas: HTMLCanvasElement

  // React's `useState(isImageElement(src) ? src : null)`: the initial value
  // only — a later `src` write is picked up by the loading effect below.
  // svelte-ignore state_referenced_locally
  let internalImage = $state<HTMLImageElement | null>(isImageElement(src) ? src : null)
  let loadError = $state<string | null>(null)

  const safeZoom = $derived(zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1)
  const safePan = $derived<PanOffset>({
    x: Number.isFinite(pan?.x) ? (pan?.x as number) : 0,
    y: Number.isFinite(pan?.y) ? (pan?.y as number) : 0,
  })
  const filterString = $derived(composeFilterString(filters))

  // Drag state lives outside reactive state: handlers mutate it without
  // re-rendering, exactly like React's ref.
  let dragState: {
    pointerId: number | null
    startX: number
    startY: number
    startPan: PanOffset
  } = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }

  // Load the source image when the prop is a URL string.
  $effect(() => {
    const current = src
    if (typeof current !== 'string') {
      if (isImageElement(current)) {
        internalImage = current
        loadError = null
      }
      return
    }

    let cancelled = false
    loadError = null
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      internalImage = img
    }
    img.onerror = () => {
      if (cancelled) return
      loadError = current
      internalImage = null
    }
    img.src = current

    return () => {
      cancelled = true
    }
  })

  // Re-paint whenever the image, viewport, or filter chain changes.
  $effect(() => {
    const image = internalImage
    const zoomValue = safeZoom
    const offset = safePan
    const filter = filterString
    const canvasWidth = width
    const canvasHeight = height
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
    const drawWidth = image.naturalWidth * zoomValue
    const drawHeight = image.naturalHeight * zoomValue
    const dx = canvasWidth / 2 - drawWidth / 2 + offset.x
    const dy = canvasHeight / 2 - drawHeight / 2 + offset.y
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
    ctx.restore()
  })

  onMount(() => {
    if (!exportRef) return
    exportRef.current = {
      toDataURL: (type, quality) => (canvas ? canvas.toDataURL(type, quality) : ''),
    }
    return () => {
      if (exportRef) exportRef.current = null
    }
  })

  /** Starts a drag, capturing the pointer for its duration. */
  function handlePointerDown(event: PointerEvent): void {
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: { ...safePan },
    }
  }

  /** Reports the proposed pan while a drag is in progress. */
  function handlePointerMove(event: PointerEvent): void {
    const state = dragState
    if (state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    const image = internalImage
    const next = clampPan(
      { x: state.startPan.x + dx, y: state.startPan.y + dy },
      { width, height },
      image ? { width: image.naturalWidth, height: image.naturalHeight } : { width, height },
      safeZoom,
    )
    onChange?.({ zoom: safeZoom, pan: next })
  }

  /** Ends a drag, releasing the capture it took. */
  function endDrag(event: PointerEvent): void {
    const state = dragState
    if (state.pointerId !== event.pointerId) return
    if (canvas && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    dragState = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }
  }

  /** Reports the zoomed factor for a wheel scroll (negative `deltaY` zooms in). */
  function handleWheel(event: WheelEvent): void {
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    const nextZoom = clamp(safeZoom * factor, 0.05, 32)
    onChange?.({ zoom: nextZoom, pan: safePan })
  }
</script>

<div
  role="region"
  aria-label={t('imageCanvas.aria.region', {}, { defaultValue: 'Image canvas' })}
  data-mol-id="image-canvas"
  class={cm.cn(className)}
  style:display="inline-block"
  style:width="{width}px"
  style:height="{height}px"
  style:position="relative"
>
  <canvas
    bind:this={canvas}
    {width}
    {height}
    aria-label={t('imageCanvas.aria.canvas', {}, { defaultValue: 'Drag to pan, scroll to zoom' })}
    data-mol-id="image-canvas-surface"
    data-loading={internalImage ? 'false' : loadError ? 'false' : 'true'}
    data-error={loadError ? 'true' : 'false'}
    style:display="block"
    style:width="{width}px"
    style:height="{height}px"
    style:cursor={onChange ? 'grab' : 'default'}
    style:touch-action="none"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={endDrag}
    onpointercancel={endDrag}
    onwheel={handleWheel}
  ></canvas>
  {#if !internalImage && !loadError}
    <p class={cm.cn(cm.textSize('xs'), cm.sp('p', 2))} data-mol-id="image-canvas-loading">
      {t('imageCanvas.loading', {}, { defaultValue: 'Loading image…' })}
    </p>
  {/if}
  {#if loadError}
    <p
      class={cm.cn(cm.textSize('xs'), cm.sp('p', 2))}
      data-mol-id="image-canvas-error"
      role="alert"
    >
      {t('imageCanvas.error', {}, { defaultValue: 'Image failed to load.' })}
    </p>
  {/if}
</div>
