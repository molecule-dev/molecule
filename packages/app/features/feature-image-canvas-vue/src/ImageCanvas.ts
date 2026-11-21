/**
 * Vue Canvas2D image-editing surface — a filter chain, pointer-drag panning,
 * wheel zooming and a data-URL export handle.
 *
 * Vue counterpart of `@molecule/app-feature-image-canvas-react`'s
 * `ImageCanvas` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import {
  computed,
  type CSSProperties,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  type VNode,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { clamp, clampPan, composeFilterString } from './helpers.js'
import { isImageElement } from './image-source.js'
import type { ImageCanvasFilters, ImageCanvasProps, PanOffset } from './types.js'

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
 * @returns The image-canvas component.
 */
export const ImageCanvas = defineComponent({
  name: 'ImageCanvas',
  props: {
    // A URL string or an already-loaded `HTMLImageElement`.
    src: {
      type: [String, Object] as PropType<string | HTMLImageElement>,
      required: true,
    },
    filters: {
      type: Object as PropType<ImageCanvasFilters>,
    },
    zoom: {
      type: Number,
      default: 1,
    },
    pan: {
      type: Object as PropType<PanOffset>,
    },
    onChange: {
      type: Function as PropType<NonNullable<ImageCanvasProps['onChange']>>,
    },
    exportRef: {
      type: Object as PropType<NonNullable<ImageCanvasProps['exportRef']>>,
    },
    width: {
      type: Number,
      default: 512,
    },
    height: {
      type: Number,
      default: 512,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    const canvasRef = ref<HTMLCanvasElement | null>(null)
    const internalImage = ref<HTMLImageElement | null>(
      isImageElement(props.src as string | HTMLImageElement)
        ? (props.src as HTMLImageElement)
        : null,
    )
    const loadError = ref<string | null>(null)

    const safeZoom = computed(() => {
      const zoom = props.zoom
      return Number.isFinite(zoom) && zoom > 0 ? zoom : 1
    })
    const safePan = computed<PanOffset>(() => ({
      x: Number.isFinite(props.pan?.x) ? (props.pan?.x as number) : 0,
      y: Number.isFinite(props.pan?.y) ? (props.pan?.y as number) : 0,
    }))
    const filterString = computed(() => composeFilterString(props.filters))

    // Drag state lives outside reactive state: handlers mutate it without
    // re-rendering, exactly like React's ref.
    let dragState: {
      pointerId: number | null
      startX: number
      startY: number
      startPan: PanOffset
    } = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }

    // Load the source image when the prop is a URL string.
    watch(
      () => props.src as string | HTMLImageElement,
      (src, _previous, onCleanup) => {
        if (typeof src !== 'string') {
          if (isImageElement(src)) {
            internalImage.value = src
            loadError.value = null
          }
          return
        }

        let cancelled = false
        onCleanup(() => {
          cancelled = true
        })
        loadError.value = null
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (cancelled) return
          internalImage.value = img
        }
        img.onerror = () => {
          if (cancelled) return
          loadError.value = src
          internalImage.value = null
        }
        img.src = src
      },
      { immediate: true },
    )

    // Re-paint whenever the image, viewport, or filter chain changes.
    const paint = (): void => {
      const canvas = canvasRef.value
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const image = internalImage.value
      const zoom = safeZoom.value
      const pan = safePan.value
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!image) {
        ctx.restore()
        return
      }

      ctx.filter = filterString.value
      const drawWidth = image.naturalWidth * zoom
      const drawHeight = image.naturalHeight * zoom
      const dx = canvas.width / 2 - drawWidth / 2 + pan.x
      const dy = canvas.height / 2 - drawHeight / 2 + pan.y
      ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
      ctx.restore()
    }

    watch(
      [
        internalImage,
        filterString,
        safeZoom,
        () => safePan.value.x,
        () => safePan.value.y,
        () => props.width,
        () => props.height,
      ],
      paint,
      { flush: 'post' },
    )

    // The canvas element exists only after mount, so the first paint runs here;
    // the watcher above covers every later change.
    onMounted(paint)

    onMounted(() => {
      if (!props.exportRef) return
      props.exportRef.current = {
        toDataURL: (type, quality) => {
          const canvas = canvasRef.value
          if (!canvas) return ''
          return canvas.toDataURL(type, quality)
        },
      }
    })

    onBeforeUnmount(() => {
      if (props.exportRef) props.exportRef.current = null
    })

    const handlePointerDown = (event: PointerEvent): void => {
      if (!canvasRef.value) return
      canvasRef.value.setPointerCapture(event.pointerId)
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPan: { ...safePan.value },
      }
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const state = dragState
      if (state.pointerId !== event.pointerId) return
      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY
      const image = internalImage.value
      const next = clampPan(
        { x: state.startPan.x + dx, y: state.startPan.y + dy },
        { width: props.width, height: props.height },
        image
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : { width: props.width, height: props.height },
        safeZoom.value,
      )
      props.onChange?.({ zoom: safeZoom.value, pan: next })
    }

    const endDrag = (event: PointerEvent): void => {
      const state = dragState
      if (state.pointerId !== event.pointerId) return
      const node = canvasRef.value
      if (node && node.hasPointerCapture(event.pointerId)) {
        node.releasePointerCapture(event.pointerId)
      }
      dragState = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }
    }

    const handleWheel = (event: WheelEvent): void => {
      // Negative deltaY = scroll up = zoom in.
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
      const nextZoom = clamp(safeZoom.value * factor, 0.05, 32)
      props.onChange?.({ zoom: nextZoom, pan: safePan.value })
    }

    return (): VNode => {
      const ariaLabel = t('imageCanvas.aria.region', {}, { defaultValue: 'Image canvas' })
      const dragLabel = t(
        'imageCanvas.aria.canvas',
        {},
        { defaultValue: 'Drag to pan, scroll to zoom' },
      )
      const loadingLabel = t('imageCanvas.loading', {}, { defaultValue: 'Loading image…' })
      const errorLabel = t('imageCanvas.error', {}, { defaultValue: 'Image failed to load.' })

      const width = props.width
      const height = props.height
      const image = internalImage.value
      const error = loadError.value

      const containerStyle: CSSProperties = {
        display: 'inline-block',
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
      }

      const canvasStyle: CSSProperties = {
        display: 'block',
        width: `${width}px`,
        height: `${height}px`,
        cursor: props.onChange ? 'grab' : 'default',
        touchAction: 'none',
      }

      const noteClass = cm.cn(cm.textSize('xs'), cm.sp('p', 2))

      return h(
        'div',
        {
          role: 'region',
          'aria-label': ariaLabel,
          'data-mol-id': 'image-canvas',
          class: cm.cn(props.className),
          style: containerStyle,
        },
        [
          h('canvas', {
            ref: canvasRef,
            width,
            height,
            'aria-label': dragLabel,
            'data-mol-id': 'image-canvas-surface',
            'data-loading': image ? 'false' : error ? 'false' : 'true',
            'data-error': error ? 'true' : 'false',
            style: canvasStyle,
            // `on:<name>` binds the native event verbatim; Vue's `onX` form
            // hyphenates a multi-word name (`onPointerDown` → `pointer-down`).
            'on:pointerdown': handlePointerDown,
            'on:pointermove': handlePointerMove,
            'on:pointerup': endDrag,
            'on:pointercancel': endDrag,
            'on:wheel': handleWheel,
          }),
          !image && !error
            ? h('p', { class: noteClass, 'data-mol-id': 'image-canvas-loading' }, loadingLabel)
            : null,
          error
            ? h(
                'p',
                { class: noteClass, 'data-mol-id': 'image-canvas-error', role: 'alert' },
                errorLabel,
              )
            : null,
        ],
      )
    }
  },
})
