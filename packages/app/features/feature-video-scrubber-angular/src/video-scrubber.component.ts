/**
 * VideoScrubber component (React parity).
 *
 * @module
 */

import {
  Component,
  type ElementRef,
  type OnChanges,
  type OnDestroy,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { Thumbnail } from './types.js'

/** Default frame rate (24fps — feature-film standard). */
export const DEFAULT_FPS = 24
/** Default number of filmstrip cells. */
export const DEFAULT_THUMBNAIL_COUNT = 12
/** Default filmstrip cell height in px. */
export const DEFAULT_THUMBNAIL_HEIGHT = 48

/** The root element's inline style, exactly as React writes it. */
const ROOT_STYLE = 'width: 100%; box-sizing: border-box'

/** One filmstrip cell (React's `computeFilmstripTicks` entry). */
interface Tick {
  /** Tick time in seconds. */
  time: number
  /** Tick position, 0..1. */
  position: number
}

/**
 * Convert a continuous time in seconds to a frame index, given a frame
 * rate. The result is rounded to the nearest integer (i.e. snapped to
 * the closest frame boundary).
 *
 * @param time - Time in seconds.
 * @param fps - Frame rate. Must be > 0.
 * @returns Integer frame index (>= 0).
 */
export function timeToFrame(time: number, fps: number): number {
  if (!Number.isFinite(time) || time <= 0) return 0
  if (!Number.isFinite(fps) || fps <= 0) return 0
  return Math.round(time * fps)
}

/**
 * Convert a frame index back to a time in seconds.
 *
 * @param frame - Frame index (any integer >= 0).
 * @param fps - Frame rate. Must be > 0.
 * @returns Time in seconds.
 */
export function frameToTime(frame: number, fps: number): number {
  if (!Number.isFinite(frame) || frame <= 0) return 0
  if (!Number.isFinite(fps) || fps <= 0) return 0
  return frame / fps
}

/**
 * Snap a continuous time value to the nearest frame boundary, then
 * clamp into `[0, duration]`. This is what the scrubber emits via
 * `onSeek` for click-anywhere scrubbing.
 *
 * @param time - Candidate time in seconds.
 * @param fps - Frame rate. Must be > 0.
 * @param duration - Maximum time in seconds (clamp upper bound).
 * @returns Frame-snapped, clamped time in seconds.
 */
export function snapTimeToFrame(time: number, fps: number, duration: number): number {
  if (!Number.isFinite(time) || time < 0) return 0
  const safeDur = Number.isFinite(duration) && duration > 0 ? duration : 0
  if (time > safeDur) return frameToTime(timeToFrame(safeDur, fps), fps)
  return frameToTime(timeToFrame(time, fps), fps)
}

/**
 * Compute evenly-spaced filmstrip ticks across `[0, duration]`. Each
 * tick has a `time` (in seconds) and a `position` (0..1) for layout
 * via `left: position * 100%`. The first tick is at time 0; the last
 * tick is at time `duration` (or 0 if `duration <= 0`).
 *
 * @param duration - Total duration in seconds.
 * @param count - Number of ticks. Coerced into `[1, 1000]`.
 * @returns Array of `{ time, position }` ticks (length === clamped count).
 */
export function computeFilmstripTicks(duration: number, count: number): Tick[] {
  const safeCount = Math.max(1, Math.min(1000, Math.round(Number.isFinite(count) ? count : 1)))
  const safeDur = Number.isFinite(duration) && duration > 0 ? duration : 0
  const ticks: Tick[] = []
  if (safeCount === 1) {
    return [{ time: 0, position: 0 }]
  }
  for (let i = 0; i < safeCount; i++) {
    const position = i / (safeCount - 1)
    ticks.push({ time: position * safeDur, position })
  }
  return ticks
}

/**
 * Pick the thumbnail whose `time` is closest to a target time. Ties
 * break toward the earlier thumbnail. Returns `undefined` only when
 * the input list is empty.
 *
 * @param thumbnails - Available thumbnails (any order).
 * @param targetTime - The target time in seconds.
 * @returns The closest thumbnail, or `undefined` if `thumbnails` is empty.
 */
export function selectClosestThumbnail(
  thumbnails: Thumbnail[],
  targetTime: number,
): Thumbnail | undefined {
  if (!thumbnails || thumbnails.length === 0) return undefined
  let best = thumbnails[0]!
  let bestDelta = Math.abs(best.time - targetTime)
  for (let i = 1; i < thumbnails.length; i++) {
    const t = thumbnails[i]!
    const delta = Math.abs(t.time - targetTime)
    if (delta < bestDelta) {
      best = t
      bestDelta = delta
    }
  }
  return best
}

/**
 * Format a frame index for the readout display — fixed-width-friendly
 * with a leading hash for clarity.
 *
 * @param frame - Frame index.
 * @returns The display string (e.g. `#42`).
 */
export function formatFrameNumber(frame: number): string {
  return `#${Math.max(0, Math.round(frame))}`
}

/** A touch may move this many CSS pixels before it counts as a swipe. */
const TOUCH_SLOP = 8

/**
 * The part of a contact's sample the strip seeks with: React's `ElementDragPoint`
 * (`@molecule/app-ui`) as this scrubber reads it.
 */
interface SeekPoint {
  /** Unclamped horizontal offset from the strip's current box. */
  readonly x: number
  /** The strip's current box in the window. */
  readonly bounds: { readonly width: number }
}

/** The contact that owns a seek in progress, until its pointer is released or interrupted. */
interface Contact {
  /** The pointer that pressed the strip. */
  readonly pointerId: number
  /** Ends the contact the way an interruption does. */
  cancel(): void
}

/**
 * Frame-accurate video scrubber. Renders an evenly-spaced filmstrip of
 * thumbnail images, a vertical playhead, and an optional frame-number
 * readout. Click anywhere on the strip to seek (snapped to the nearest
 * frame); use `←/→` arrows to step ±1 frame, or `Shift+←/→` to step
 * ±1 second. All `onSeek` calls receive frame-snapped times.
 *
 * The host IS the root `<div>` (`div[mol-video-scrubber]`), matching React's
 * root exactly, so the root's ClassMap classes and inline style are the
 * host's.
 */
@Component({
  selector: 'div[mol-video-scrubber]',
  standalone: true,
  inputs: [
    'duration',
    'currentTime',
    'fps',
    'thumbnails',
    'onSeek',
    'showFrameNumber',
    'thumbnailCount',
    'thumbnailHeight',
    'id',
    'className',
  ],
  host: {
    role: 'group',
    'data-mol-id': 'video-scrubber',
    '[attr.id]': 'id ?? null',
    '[attr.aria-label]': 'rootLabel()',
    '[attr.data-fps]': 'safeFps()',
    '[attr.data-frame]': 'currentFrame()',
    '[class]': 'classes()',
    '[style]': 'rootStyle',
  },
  // prettier-ignore
  template: `<div #strip role="slider" tabindex="0" [attr.aria-label]="stripLabel()" aria-valuemin="0" [attr.aria-valuemax]="safeDuration()" [attr.aria-valuenow]="clampedTime()" data-mol-id="video-scrubber-strip" [style]="stripBodyStyle()" (pointerdown)="onStripPointerDown($event)" (keydown)="onKeyDown($event)">@for (tk of ticks(); track $index) {<div data-mol-id="video-scrubber-cell" [attr.data-time]="tk.time" [attr.data-index]="$index" role="img" [attr.aria-label]="cellLabel(tk.time)" [style]="cellStyle(tk.time)"></div>}<div data-mol-id="video-scrubber-playhead" [attr.aria-label]="playheadLabel()" [style]="playheadStyle()"></div></div>@if (showFrameReadout()) {<div data-mol-id="video-scrubber-frame-readout" [attr.aria-label]="frameReadoutLabel()" [class]="readoutClasses()" style="font-variant-numeric: tabular-nums"><span data-mol-id="video-scrubber-frame-current">{{ frameNumber() }}</span><span data-mol-id="video-scrubber-frame-total">{{ totalLabel() }}</span></div>}`,
})
export class VideoScrubber implements OnChanges, OnDestroy {
  /** Total media duration in seconds. */
  duration = 0
  /** Current playhead time in seconds. */
  currentTime = 0
  /** Frames-per-second used for snapping + frame-step keyboard (defaults to 24). */
  fps?: number
  /** Pre-computed thumbnails. The scrubber picks the closest one per filmstrip tick. */
  thumbnails?: Thumbnail[]
  /** Called with the seek time (snapped to the nearest frame). */
  onSeek?: (time: number) => void
  /** Whether to show the frame-number readout (defaults to `true`). */
  showFrameNumber?: boolean
  /** Number of filmstrip cells to render (defaults to 12). */
  thumbnailCount?: number
  /** Filmstrip cell height in px (defaults to 48). */
  thumbnailHeight?: number
  /** Optional id for the root element (useful for label associations). */
  id?: string
  /** Extra classes merged onto the root element. */
  className?: string

  /** The mountable strip, whose bounding box maps a pointer to a time. */
  @ViewChild('strip') stripRef?: ElementRef<HTMLDivElement>

  /** React's root inline style. */
  readonly rootStyle = ROOT_STYLE

  /** The i18n state; `t` re-reads the provider on every call and on every locale switch. */
  private readonly i18n = useTranslation()

  /** The contact in progress, or null. */
  private contact: Contact | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list (React's `cm.cn(className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The frame readout's classes (React's `cm.cn(cm.flex(...), cm.sp('p', 1))`).
   * @returns The class string.
   */
  readoutClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between' }),
      this.cm().sp('p', 1),
    )
  }

  /**
   * React's `fps = DEFAULT_FPS` default, then its safety fallback.
   * @returns A usable frame rate.
   */
  safeFps(): number {
    const fps = this.fps === undefined ? DEFAULT_FPS : this.fps
    return Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS
  }

  /**
   * React's `duration <= 0` guard.
   * @returns The usable duration (0 when invalid).
   */
  safeDuration(): number {
    return Number.isFinite(this.duration) && this.duration > 0 ? this.duration : 0
  }

  /**
   * React's playhead time: non-positive and non-finite clamp to 0, and a time
   * past the duration clamps to the duration.
   * @returns The clamped playhead time.
   */
  clampedTime(): number {
    const time = Number.isFinite(this.currentTime) && this.currentTime > 0 ? this.currentTime : 0
    const duration = this.safeDuration()
    return time > duration ? duration : time
  }

  /**
   * The current frame index (React's `timeToFrame(clampedTime, safeFps)`).
   * @returns The frame index.
   */
  currentFrame(): number {
    return timeToFrame(this.clampedTime(), this.safeFps())
  }

  /**
   * The total frame count (React's `timeToFrame(safeDuration, safeFps)`).
   * @returns The frame count.
   */
  totalFrames(): number {
    return timeToFrame(this.safeDuration(), this.safeFps())
  }

  /**
   * Whether the frame-number readout renders (React's `showFrameNumber = true`).
   * @returns Whether it renders.
   */
  showFrameReadout(): boolean {
    return this.showFrameNumber === undefined ? true : Boolean(this.showFrameNumber)
  }

  /**
   * The playhead position across the strip, 0..1.
   * @returns The position.
   */
  playheadPosition(): number {
    const duration = this.safeDuration()
    return duration > 0 ? this.clampedTime() / duration : 0
  }

  /**
   * The filmstrip cells (React's `computeFilmstripTicks`).
   * @returns The ticks.
   */
  ticks(): Tick[] {
    const count = this.thumbnailCount === undefined ? DEFAULT_THUMBNAIL_COUNT : this.thumbnailCount
    return computeFilmstripTicks(this.safeDuration(), count)
  }

  /**
   * The filmstrip cell height in px.
   * @returns The height.
   */
  cellHeight(): number {
    return this.thumbnailHeight === undefined ? DEFAULT_THUMBNAIL_HEIGHT : this.thumbnailHeight
  }

  /**
   * The strip body's inline style (React's `stripBodyStyle`).
   * @returns The `style` attribute text.
   */
  stripBodyStyle(): string {
    return [
      'position: relative',
      'display: flex',
      'width: 100%',
      `height: ${this.cellHeight()}px`,
      'overflow: hidden',
      `cursor: ${typeof this.onSeek === 'function' ? 'pointer' : 'default'}`,
      'touch-action: none',
      'user-select: none',
    ].join('; ')
  }

  /**
   * The playhead's inline style (React's `playheadStyle`).
   * @returns The `style` attribute text.
   */
  playheadStyle(): string {
    return [
      'position: absolute',
      'top: 0px',
      'bottom: 0px',
      'width: 2px',
      `left: ${this.playheadPosition() * 100}%`,
      'transform: translateX(-1px)',
      'background: var(--mol-video-scrubber-playhead, #ff3b30)',
      'pointer-events: none',
      'z-index: 2',
    ].join('; ')
  }

  /**
   * Pick the closest thumbnail's src for a tick time, or empty string when no
   * thumbnails are available.
   * @param time - Tick time in seconds.
   * @returns The thumbnail src or empty string.
   */
  cellThumbnail(time: number): string {
    const list = this.thumbnails
    if (!list || list.length === 0) return ''
    return selectClosestThumbnail(list, time)?.src ?? ''
  }

  /**
   * One filmstrip cell's inline style (React's `cellStyle`).
   * @param time - Tick time in seconds.
   * @returns The `style` attribute text.
   */
  cellStyle(time: number): string {
    const src = this.cellThumbnail(time)
    return [
      'flex: 1 1 0px',
      'min-width: 0px',
      'height: 100%',
      ...(src ? [`background-image: url("${src}")`] : []),
      'background-size: cover',
      'background-position: center center',
      'background-color: var(--mol-video-scrubber-cell-bg, rgba(127, 127, 127, 0.15))',
      'border-right: var(--mol-video-scrubber-cell-divider, 1px solid rgba(0, 0, 0, 0.08))',
    ].join('; ')
  }

  /**
   * A filmstrip cell's accessible name (React's `aria-label`).
   * @param time - Tick time in seconds.
   * @returns The label text.
   */
  cellLabel(time: number): string {
    return this.cellThumbnail(time)
      ? this.i18n.t('videoScrubber.aria.thumbnail', {}, { defaultValue: 'Frame preview' })
      : this.i18n.t('videoScrubber.thumbnails.empty', {}, { defaultValue: 'No preview' })
  }

  /**
   * The root element's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  rootLabel(): string {
    return this.i18n.t('videoScrubber.aria.root', {}, { defaultValue: 'Video scrubber' })
  }

  /**
   * The strip's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  stripLabel(): string {
    return this.i18n.t(
      'videoScrubber.aria.strip',
      { time: this.clampedTime().toFixed(2), frame: this.currentFrame() },
      { defaultValue: 'Filmstrip — playhead at {{time}}s (frame {{frame}})' },
    )
  }

  /**
   * The playhead's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  playheadLabel(): string {
    return this.i18n.t(
      'videoScrubber.aria.playhead',
      { time: this.clampedTime().toFixed(2) },
      { defaultValue: 'Playhead at {{time}}s' },
    )
  }

  /**
   * The frame readout's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  frameReadoutLabel(): string {
    return this.i18n.t(
      'videoScrubber.aria.frameReadout',
      { frame: this.currentFrame(), total: this.totalFrames() },
      { defaultValue: 'Frame {{frame}} of {{total}}' },
    )
  }

  /**
   * The readout's total-frame text (React's `/ {{total}} frames`).
   * @returns The text.
   */
  totalLabel(): string {
    return this.i18n.t(
      'videoScrubber.frameReadout.total',
      { total: this.totalFrames() },
      { defaultValue: '/ {{total}} frames' },
    )
  }

  /**
   * The current frame number as shown in the readout (React's `formatFrameNumber(currentFrame)`).
   * @returns The display string.
   */
  frameNumber(): string {
    return formatFrameNumber(this.currentFrame())
  }

  /**
   * Seek to the nearest frame at the contact's horizontal position.
   * @param point - The contact in strip coordinates.
   */
  private seekAt({ x, bounds }: SeekPoint): void {
    const duration = this.safeDuration()
    const ratio = bounds.width > 0 ? Math.max(0, Math.min(1, x / bounds.width)) : 0
    this.onSeek?.(snapTimeToFrame(ratio * duration, this.safeFps(), duration))
  }

  /**
   * End the contact in progress, as when the strip stops being seekable or the
   * scrubber is destroyed under a held pointer.
   */
  private endContact(): void {
    this.contact?.cancel()
  }

  /**
   * Ends a contact in progress when the strip stops being seekable.
   * @param changes - The inputs that changed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const seek = changes['onSeek']
    if (seek && typeof seek.currentValue !== 'function') this.endContact()
  }

  /** Ends a contact in progress before the scrubber is destroyed. */
  ngOnDestroy(): void {
    this.endContact()
  }

  /**
   * Begin a contact on the strip: seek at the press, then keep following that one
   * pointer wherever it moves in the window until it is released or interrupted.
   * @param event - The native pointer event from the strip.
   */
  onStripPointerDown(event: PointerEvent): void {
    if (event.button !== undefined && event.button !== 0) return
    if (typeof this.onSeek !== 'function') return
    // A pointer event can lack a device type when dispatched through a mouse-only host.
    if (event.pointerType && event.isPrimary === false) return
    const host = this.stripRef?.nativeElement
    const ownerWindow = host?.ownerDocument.defaultView
    if (!host || !ownerWindow) return
    const { pointerId } = event
    // A press from another pointer leaves the contact in progress alone; the same
    // pointer pressing again after a lost release starts a new contact.
    if (this.contact && this.contact.pointerId !== pointerId) return
    this.endContact()

    const down = event
    const touch = down.pointerType === 'touch'
    let captured = false
    // The strip's own style forbids touch scrolling, so a touch on it never yields to a
    // scroller; only a stylesheet that overrides the style makes the choice below matter.
    let axisChosen = touch && ownerWindow.getComputedStyle(host).touchAction === 'none'
    const session: Contact = { pointerId, cancel: () => finish() }
    this.contact = session

    /** Samples the contact against the strip's current box. */
    const sample = (at: PointerEvent): SeekPoint => {
      const { left, width } = host.getBoundingClientRect()
      return { x: at.clientX - left, bounds: { width } }
    }

    /**
     * Whether a touch whose scroll intent is still undecided has become a vertical
     * swipe, which belongs to an enclosing scroller.
     */
    const shouldYield = (x: number, y: number): boolean => {
      if (!touch || axisChosen) return false
      const dx = Math.abs(x - down.clientX)
      const dy = Math.abs(y - down.clientY)
      if (Math.max(dx, dy) <= TOUCH_SLOP) return false
      axisChosen = true
      return dy > dx
    }

    /** Scrubs to the owning pointer's position. */
    const move = (at: PointerEvent): void => {
      if (at.pointerId !== pointerId) return
      if (shouldYield(at.clientX, at.clientY)) finish()
      else this.seekAt(sample(at))
    }

    /** Keeps a held touch for the scrubber instead of the page scroll. */
    const preventScroll = (at: TouchEvent): void => {
      const finger = at.touches[0]
      if (at.touches.length !== 1 || !finger) return
      if (shouldYield(finger.clientX, finger.clientY)) finish()
      else if (axisChosen && at.cancelable) at.preventDefault()
    }

    /** Releases the contact when its pointer lifts. */
    const up = (at: PointerEvent): void => {
      if (at.pointerId === pointerId) finish()
    }

    /** Ends the contact when its pointer is cancelled or the strip loses its capture. */
    const cancel = (at: Event): void => {
      const id = 'pointerId' in at ? at.pointerId : undefined
      if (id === pointerId) finish()
    }

    /** Tears the contact down: unlistens, then gives up the pointer capture. */
    const finish = (): void => {
      if (this.contact !== session) return
      this.contact = null
      ownerWindow.removeEventListener('pointermove', move, true)
      ownerWindow.removeEventListener('pointerup', up, true)
      ownerWindow.removeEventListener('pointercancel', cancel, true)
      ownerWindow.removeEventListener('touchmove', preventScroll)
      ownerWindow.removeEventListener('blur', session.cancel)
      host.removeEventListener('lostpointercapture', cancel)
      if (captured && host.releasePointerCapture) {
        try {
          host.releasePointerCapture(pointerId)
        } catch (_error) {
          // The browser can release capture before notifying of the cancellation or removal.
        }
      }
    }

    // Window capture listeners: the pointer is followed outside the strip and past any
    // handler that stops propagation.
    ownerWindow.addEventListener('pointermove', move, true)
    ownerWindow.addEventListener('pointerup', up, true)
    ownerWindow.addEventListener('pointercancel', cancel, true)
    ownerWindow.addEventListener('blur', session.cancel)
    host.addEventListener('lostpointercapture', cancel)
    if (touch) ownerWindow.addEventListener('touchmove', preventScroll, { passive: false })
    if (host.setPointerCapture && Number.isFinite(pointerId)) {
      try {
        host.setPointerCapture(pointerId)
        captured = true
      } catch (_error) {
        // A browser may reject capture for a contact it no longer tracks. The window listens too.
      }
    }
    this.seekAt(sample(down))
  }

  /**
   * Handle keyboard scrubbing. ←/→ step ±1 frame; Shift+←/→ step ±1 second.
   * Home/End jump to start/end. PageUp/PageDown step ±10 frames. Always emits
   * a frame-snapped, clamped time via `onSeek`.
   * @param event - The native keyboard event.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (typeof this.onSeek !== 'function') return
    const duration = this.safeDuration()
    const fps = this.safeFps()
    const clampedTime = this.clampedTime()
    const currentFrame = timeToFrame(clampedTime, fps)
    const { key, shiftKey } = event
    let next: number | null = null
    if (key === 'ArrowLeft') {
      next = shiftKey ? clampedTime - 1 : frameToTime(currentFrame - 1, fps)
    } else if (key === 'ArrowRight') {
      next = shiftKey ? clampedTime + 1 : frameToTime(currentFrame + 1, fps)
    } else if (key === 'PageUp') {
      next = frameToTime(currentFrame - 10, fps)
    } else if (key === 'PageDown') {
      next = frameToTime(currentFrame + 10, fps)
    } else if (key === 'Home') {
      next = 0
    } else if (key === 'End') {
      next = duration
    }
    if (next === null) return
    event.preventDefault()
    this.onSeek(snapTimeToFrame(next, fps, duration))
  }
}
