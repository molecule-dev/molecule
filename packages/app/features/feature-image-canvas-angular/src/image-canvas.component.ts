/**
 * ImageCanvas component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  computed,
  type ElementRef,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { clamp, clampPan, composeFilterString } from './helpers.js'
import { isImageElement } from './image-source.js'
import type { ImageCanvasFilters, ImageCanvasProps, PanOffset } from './types.js'

/**
 * Canvas2D image-editing surface: a source image drawn onto a canvas with a
 * filter chain, pointer-drag panning, wheel zooming, and a `toDataURL()`
 * export handle.
 *
 * The host IS React's root element (`div[mol-image-canvas]`), so the host
 * carries the region role, the aria label, the ClassMap classes and the frame
 * size exactly as React renders them. All user-visible text is translated
 * through the binding's `useTranslation()`.
 */
@Component({
  selector: 'div[mol-image-canvas]',
  standalone: true,
  inputs: [
    'src',
    'filters',
    'zoom',
    'pan',
    'onChange',
    'exportRef',
    'width',
    'height',
    'className',
  ],
  host: {
    role: 'region',
    'data-mol-id': 'image-canvas',
    '[attr.aria-label]': 'ariaLabel()',
    '[class]': 'classes()',
    '[style.display]': '"inline-block"',
    '[style.width.px]': 'widthValue()',
    '[style.height.px]': 'heightValue()',
    '[style.position]': '"relative"',
  },
  template: `<canvas
      #surface
      [attr.width]="widthValue()"
      [attr.height]="heightValue()"
      [attr.aria-label]="dragLabel()"
      data-mol-id="image-canvas-surface"
      [attr.data-loading]="loadingAttr()"
      [attr.data-error]="errorAttr()"
      [style.display]="'block'"
      [style.width.px]="widthValue()"
      [style.height.px]="heightValue()"
      [style.cursor]="cursor()"
      [style.touch-action]="'none'"
      (pointerdown)="handlePointerDown($event)"
      (pointermove)="handlePointerMove($event)"
      (pointerup)="endDrag($event)"
      (pointercancel)="endDrag($event)"
      (wheel)="handleWheel($event)"
    ></canvas>
    @if (loadingAttr() === 'true') {
      <p [class]="noteClasses()" data-mol-id="image-canvas-loading">{{ loadingLabel() }}</p>
    }
    @if (loadError() !== null) {
      <p [class]="noteClasses()" data-mol-id="image-canvas-error" role="alert">
        {{ errorLabel() }}
      </p>
    }`,
})
export class ImageCanvas implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  /** Image source: a URL/data-URL string, or an already-loaded `HTMLImageElement`. */
  src?: string | HTMLImageElement
  /** Filter chain applied to the rendered image. */
  filters?: ImageCanvasFilters
  /** Zoom factor; values <= 0 fall back to `1`. */
  zoom?: number
  /** Pan offset in CSS pixels relative to the centre of the canvas. */
  pan?: PanOffset
  /** Fired when the user pans or zooms the canvas. */
  onChange?: (next: { zoom: number; pan: PanOffset }) => void
  /** Receives the `toDataURL()` handle while the canvas is mounted. */
  exportRef?: ImageCanvasProps['exportRef']
  /** Pixel width of the canvas (defaults to `512`). */
  width?: number
  /** Pixel height of the canvas (defaults to `512`). */
  height?: number
  /** Extra classes merged onto the root element. */
  className?: string

  /** The canvas surface, referenced for painting and the export handle. */
  @ViewChild('surface') private surface?: ElementRef<HTMLCanvasElement>

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()
  /** The translation function for templates and host bindings. */
  private t = this.i18n.t
  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly classMap: UIClassMap = getClassMap()

  private readonly image = signal<HTMLImageElement | null>(null)
  private readonly loadError = signal<string | null>(null)
  private loadToken = 0
  private viewReady = false
  private dragState: {
    pointerId: number | null
    startX: number
    startY: number
    startPan: PanOffset
  } = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }

  /** The region's translated aria label. */
  protected readonly ariaLabel = computed(() =>
    this.t('imageCanvas.aria.region', {}, { defaultValue: 'Image canvas' }),
  )

  /** The canvas's translated aria label. */
  protected readonly dragLabel = computed(() =>
    this.t('imageCanvas.aria.canvas', {}, { defaultValue: 'Drag to pan, scroll to zoom' }),
  )

  /** The translated loading message. */
  protected readonly loadingLabel = computed(() =>
    this.t('imageCanvas.loading', {}, { defaultValue: 'Loading image…' }),
  )

  /** The translated error message. */
  protected readonly errorLabel = computed(() =>
    this.t('imageCanvas.error', {}, { defaultValue: 'Image failed to load.' }),
  )

  /** `data-loading`: `'true'` until an image arrives (React's expression, flattened). */
  protected readonly loadingAttr = computed(() =>
    this.image() ? 'false' : this.loadError() ? 'false' : 'true',
  )

  /** `data-error`: `'true'` after a failed load. */
  protected readonly errorAttr = computed(() => (this.loadError() ? 'true' : 'false'))

  /**
   * Seeds the internal image from an element source and starts a URL load —
   * React's `useState` initial value plus its mount effect.
   */
  ngOnInit(): void {
    const src = this.src
    if (typeof src === 'string') {
      this.load(src)
    } else if (src !== undefined && isImageElement(src)) {
      this.image.set(src)
      this.loadError.set(null)
    }
  }

  /**
   * Loads a changed `src` and re-paints for every other input change.
   *
   * @param changes - The changed inputs (React's effect dependencies).
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return
    if (changes['src']) {
      const src = changes['src'].currentValue as string | HTMLImageElement | undefined
      if (typeof src === 'string') this.load(src)
      else if (src !== undefined && isImageElement(src)) {
        this.image.set(src)
        this.loadError.set(null)
      }
    }
    this.paint()
  }

  /** Paints the first frame and hands out the export handle (React's mount effects). */
  ngAfterViewInit(): void {
    this.viewReady = true
    this.paint()
    if (this.exportRef) {
      this.exportRef.current = {
        toDataURL: (type, quality) => {
          const canvas = this.surface?.nativeElement
          if (!canvas) return ''
          return canvas.toDataURL(type, quality)
        },
      }
    }
  }

  /** Clears the export handle, as React's `useImperativeHandle` cleanup does. */
  ngOnDestroy(): void {
    if (this.exportRef) this.exportRef.current = null
  }

  /** The frame's class list (`cm.cn(className)` only, as React composes it). */
  classes(): string {
    return this.classMap.cn(this.className)
  }

  /** The canvas bitmap width (React's default parameter). */
  widthValue(): number {
    return this.width ?? 512
  }

  /** The canvas bitmap height (React's default parameter). */
  heightValue(): number {
    return this.height ?? 512
  }

  /** The cursor style: `grab` while `onChange` is provided. */
  cursor(): string {
    return this.onChange ? 'grab' : 'default'
  }

  /** The loading/error paragraph's class list. */
  noteClasses(): string {
    return this.classMap.cn(this.classMap.textSize('xs'), this.classMap.sp('p', 2))
  }

  /**
   * Starts a drag, capturing the pointer for its duration.
   *
   * @param event - The pointerdown event.
   */
  handlePointerDown(event: PointerEvent): void {
    const canvas = this.surface?.nativeElement
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    this.dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: { ...this.safePan() },
    }
  }

  /**
   * Reports the proposed pan while a drag is in progress.
   *
   * @param event - The pointermove event.
   */
  handlePointerMove(event: PointerEvent): void {
    const state = this.dragState
    if (state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    const image = this.image()
    const next = clampPan(
      { x: state.startPan.x + dx, y: state.startPan.y + dy },
      { width: this.widthValue(), height: this.heightValue() },
      image
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: this.widthValue(), height: this.heightValue() },
      this.safeZoom(),
    )
    this.onChange?.({ zoom: this.safeZoom(), pan: next })
  }

  /**
   * Ends a drag, releasing the capture it took.
   *
   * @param event - The pointerup or pointercancel event.
   */
  endDrag(event: PointerEvent): void {
    const state = this.dragState
    if (state.pointerId !== event.pointerId) return
    const canvas = this.surface?.nativeElement
    if (canvas && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    this.dragState = { pointerId: null, startX: 0, startY: 0, startPan: { x: 0, y: 0 } }
  }

  /**
   * Reports the zoomed factor for a wheel scroll (negative `deltaY` zooms in).
   *
   * @param event - The wheel event.
   */
  handleWheel(event: WheelEvent): void {
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    const nextZoom = clamp(this.safeZoom() * factor, 0.05, 32)
    this.onChange?.({ zoom: nextZoom, pan: this.safePan() })
  }

  /** The sanitised zoom factor (React's `safeZoom`). */
  private safeZoom(): number {
    const zoom = this.zoom
    return zoom !== undefined && Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  }

  /** The sanitised pan offset (React's `safePan`). */
  private safePan(): PanOffset {
    return {
      x: Number.isFinite(this.pan?.x) ? (this.pan?.x as number) : 0,
      y: Number.isFinite(this.pan?.y) ? (this.pan?.y as number) : 0,
    }
  }

  /**
   * Loads a URL source into an internal image (React's loading effect).
   *
   * @param src - The URL or data URL.
   */
  private load(src: string): void {
    const token = ++this.loadToken
    this.loadError.set(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (token !== this.loadToken) return
      this.image.set(img)
      this.paint()
    }
    img.onerror = () => {
      if (token !== this.loadToken) return
      this.loadError.set(src)
      this.image.set(null)
      this.paint()
    }
    img.src = src
  }

  /** Re-paints the canvas from the image, viewport and filter chain. */
  private paint(): void {
    const canvas = this.surface?.nativeElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = this.image()
    const zoom = this.safeZoom()
    const pan = this.safePan()
    const width = this.widthValue()
    const height = this.heightValue()

    ctx.save()
    ctx.clearRect(0, 0, width, height)

    if (!image) {
      ctx.restore()
      return
    }

    ctx.filter = composeFilterString(this.filters)
    const drawWidth = image.naturalWidth * zoom
    const drawHeight = image.naturalHeight * zoom
    const dx = width / 2 - drawWidth / 2 + pan.x
    const dy = height / 2 - drawHeight / 2 + pan.y
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight)
    ctx.restore()
  }
}
