/**
 * Vue frame-accurate video scrubber: a thumbnail filmstrip with a
 * click-to-seek playhead, frame-by-frame keyboard stepping and an optional
 * frame-number readout.
 *
 * Vue counterpart of `@molecule/app-feature-video-scrubber-react`'s
 * `VideoScrubber` — the same props (React names), the same ClassMap classes,
 * inline styles and callbacks, and therefore the same DOM for the same input.
 *
 * @module
 */

import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  onBeforeUnmount,
  type PropType,
  type VNode,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { Thumbnail } from './types.js'

/** Default frame rate (24fps — feature-film standard). */
export const DEFAULT_FPS = 24
/** Default number of filmstrip cells. */
export const DEFAULT_THUMBNAIL_COUNT = 12
/** Default filmstrip cell height in px. */
export const DEFAULT_THUMBNAIL_HEIGHT = 48

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
export function computeFilmstripTicks(
  duration: number,
  count: number,
): { time: number; position: number }[] {
  const safeCount = Math.max(1, Math.min(1000, Math.round(Number.isFinite(count) ? count : 1)))
  const safeDur = Number.isFinite(duration) && duration > 0 ? duration : 0
  const ticks: { time: number; position: number }[] = []
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

/**
 * React's `fps = DEFAULT_FPS` default, then its safety fallback.
 *
 * @param value - The `fps` prop.
 * @returns A usable frame rate.
 */
function safeFpsOf(value: number | undefined): number {
  const fps = value === undefined ? DEFAULT_FPS : value
  return Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS
}

/**
 * React's `duration <= 0` guard.
 *
 * @param value - The `duration` prop.
 * @returns The usable duration (0 when invalid).
 */
function safeDurationOf(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * React's playhead time: non-positive and non-finite clamp to 0, and a time
 * past the duration clamps to the duration.
 *
 * @param value - The `currentTime` prop.
 * @param duration - The safe duration.
 * @returns The clamped playhead time.
 */
function clampedTimeOf(value: number, duration: number): number {
  const time = Number.isFinite(value) && value > 0 ? value : 0
  return time > duration ? duration : time
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
 * Composes well with `<VideoTimeline>` from
 * `@molecule/app-feature-video-timeline-vue` — the scrubber shows
 * preview thumbnails and frame-precision controls; the timeline shows
 * multi-track structure.
 *
 * @param props - Component props (see `VideoScrubberProps`).
 * @returns The scrubber component.
 */
export const VideoScrubber = defineComponent({
  name: 'VideoScrubber',
  props: {
    duration: { type: Number, required: true },
    currentTime: { type: Number, required: true },
    fps: { type: Number, default: undefined },
    thumbnails: {
      type: Array as PropType<Thumbnail[]>,
      default: undefined,
    },
    onSeek: {
      type: Function as PropType<(time: number) => void>,
      default: undefined,
    },
    showFrameNumber: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    thumbnailCount: { type: Number, default: undefined },
    thumbnailHeight: { type: Number, default: undefined },
    id: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** The mounted strip element, whose bounding box maps a pointer to a time. */
    let stripNode: HTMLDivElement | null = null
    /** The contact in progress, or null. */
    let contact: Contact | null = null

    /**
     * Records the mounted strip element.
     *
     * @param el - The element Vue passes to the ref callback.
     */
    const captureStrip = (el: Element | ComponentPublicInstance | null): void => {
      stripNode = el instanceof HTMLDivElement ? el : null
    }

    /**
     * Seek to the nearest frame at the contact's horizontal position.
     *
     * @param point - The contact in strip coordinates.
     */
    const seekAt = ({ x, bounds }: SeekPoint): void => {
      const duration = safeDurationOf(props.duration)
      const ratio = bounds.width > 0 ? Math.max(0, Math.min(1, x / bounds.width)) : 0
      props.onSeek?.(snapTimeToFrame(ratio * duration, safeFpsOf(props.fps), duration))
    }

    /**
     * End the contact in progress, as when the strip stops being seekable or the
     * scrubber unmounts under a held pointer.
     */
    const endContact = (): void => {
      contact?.cancel()
    }

    /**
     * Begin a contact on the strip body: seek at the press, then keep following that
     * one pointer wherever it moves in the window until it is released or interrupted.
     *
     * @param event - The native pointer event from the strip body.
     */
    const onStripPointerDown = (event: PointerEvent): void => {
      if (event.button !== undefined && event.button !== 0) return
      // A pointer event can lack a device type when dispatched through a mouse-only host.
      if (event.pointerType && event.isPrimary === false) return
      const host = stripNode
      const ownerWindow = host?.ownerDocument.defaultView
      if (!host || !ownerWindow) return
      const { pointerId } = event
      // A press from another pointer leaves the contact in progress alone; the same
      // pointer pressing again after a lost release starts a new contact.
      if (contact && contact.pointerId !== pointerId) return
      contact?.cancel()

      const down = event
      const touch = down.pointerType === 'touch'
      let captured = false
      // The strip's own style forbids touch scrolling, so a touch on it never yields to a
      // scroller; only a stylesheet that overrides the style makes the choice below matter.
      let axisChosen = touch && ownerWindow.getComputedStyle(host).touchAction === 'none'
      const session: Contact = { pointerId, cancel: () => finish() }
      contact = session

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
        else seekAt(sample(at))
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
        if (contact !== session) return
        contact = null
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
      seekAt(sample(down))
    }

    // The contact ends when the strip stops being seekable, and when the scrubber goes away.
    watch(
      () => typeof props.onSeek === 'function',
      (seekable) => {
        if (!seekable) endContact()
      },
      { flush: 'sync' },
    )
    onBeforeUnmount(endContact)

    /**
     * Handle keyboard scrubbing. ←/→ step ±1 frame; Shift+←/→ step
     * ±1 second. Home/End jump to start/end. PageUp/PageDown step ±10
     * frames. Always emits a frame-snapped, clamped time via `onSeek`.
     *
     * @param event - The native keyboard event.
     */
    const onKeyDown = (event: KeyboardEvent): void => {
      if (typeof props.onSeek !== 'function') return
      const duration = safeDurationOf(props.duration)
      const fps = safeFpsOf(props.fps)
      const clampedTime = clampedTimeOf(props.currentTime, duration)
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
      props.onSeek(snapTimeToFrame(next, fps, duration))
    }

    return (): VNode => {
      const safeFps = safeFpsOf(props.fps)
      const safeDuration = safeDurationOf(props.duration)
      const clampedTime = clampedTimeOf(props.currentTime, safeDuration)
      const currentFrame = timeToFrame(clampedTime, safeFps)
      const totalFrames = timeToFrame(safeDuration, safeFps)
      const showFrameNumber = props.showFrameNumber === undefined ? true : props.showFrameNumber
      const thumbnailCount =
        props.thumbnailCount === undefined ? DEFAULT_THUMBNAIL_COUNT : props.thumbnailCount
      const thumbnailHeight =
        props.thumbnailHeight === undefined ? DEFAULT_THUMBNAIL_HEIGHT : props.thumbnailHeight

      const ticks = computeFilmstripTicks(safeDuration, thumbnailCount)
      const playheadPosition = safeDuration > 0 ? clampedTime / safeDuration : 0
      const interactive = typeof props.onSeek === 'function'

      // Translation strings — companion locale bond
      // (`@molecule/app-locales-feature-video-scrubber`) overrides
      // these; the inline default values are the English fallbacks.
      const rootLabel = t('videoScrubber.aria.root', {}, { defaultValue: 'Video scrubber' })
      const stripLabel = t(
        'videoScrubber.aria.strip',
        { time: clampedTime.toFixed(2), frame: currentFrame },
        { defaultValue: 'Filmstrip — playhead at {{time}}s (frame {{frame}})' },
      )
      const playheadLabel = t(
        'videoScrubber.aria.playhead',
        { time: clampedTime.toFixed(2) },
        { defaultValue: 'Playhead at {{time}}s' },
      )
      const frameReadoutLabel = t(
        'videoScrubber.aria.frameReadout',
        { frame: currentFrame, total: totalFrames },
        { defaultValue: 'Frame {{frame}} of {{total}}' },
      )
      const thumbnailAlt = t('videoScrubber.aria.thumbnail', {}, { defaultValue: 'Frame preview' })
      const noThumbnailsLabel = t(
        'videoScrubber.thumbnails.empty',
        {},
        { defaultValue: 'No preview' },
      )

      /**
       * Pick the closest thumbnail's src for a tick time, or empty string
       * when no thumbnails are available.
       *
       * @param cellTime - Tick time in seconds.
       * @returns The thumbnail src or empty string.
       */
      const cellThumbnail = (cellTime: number): string => {
        const list = props.thumbnails
        if (!list || list.length === 0) return ''
        return selectClosestThumbnail(list, cellTime)?.src ?? ''
      }

      const rootStyle = { width: '100%', boxSizing: 'border-box' }
      const stripBodyStyle = {
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: `${thumbnailHeight}px`,
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        touchAction: 'none',
        userSelect: 'none',
      }
      const playheadStyle = {
        position: 'absolute',
        top: '0px',
        bottom: '0px',
        width: '2px',
        left: `${playheadPosition * 100}%`,
        transform: 'translateX(-1px)',
        background: 'var(--mol-video-scrubber-playhead, #ff3b30)',
        pointerEvents: 'none',
        zIndex: '2',
      }
      const frameReadoutStyle = { fontVariantNumeric: 'tabular-nums' }

      const cells = ticks.map((tk, i) => {
        const src = cellThumbnail(tk.time)
        return h('div', {
          key: `cell-${i}`,
          'data-mol-id': 'video-scrubber-cell',
          'data-time': tk.time,
          'data-index': i,
          role: 'img',
          'aria-label': src ? thumbnailAlt : noThumbnailsLabel,
          style: {
            flex: '1 1 0px',
            minWidth: '0px',
            height: '100%',
            backgroundImage: src ? `url("${src}")` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundColor: 'var(--mol-video-scrubber-cell-bg, rgba(127, 127, 127, 0.15))',
            borderRight: 'var(--mol-video-scrubber-cell-divider, 1px solid rgba(0, 0, 0, 0.08))',
          },
        })
      })

      const children: VNode[] = [
        h(
          'div',
          {
            ref: captureStrip,
            role: 'slider',
            tabIndex: 0,
            'aria-label': stripLabel,
            'aria-valuemin': 0,
            'aria-valuemax': safeDuration,
            'aria-valuenow': clampedTime,
            'data-mol-id': 'video-scrubber-strip',
            style: stripBodyStyle,
            onPointerdown: interactive ? onStripPointerDown : undefined,
            onKeydown: onKeyDown,
          },
          [
            ...cells,
            h('div', {
              'data-mol-id': 'video-scrubber-playhead',
              'aria-label': playheadLabel,
              style: playheadStyle,
            }),
          ],
        ),
      ]

      if (showFrameNumber) {
        children.push(
          h(
            'div',
            {
              'data-mol-id': 'video-scrubber-frame-readout',
              'aria-label': frameReadoutLabel,
              class: cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('p', 1)),
              style: frameReadoutStyle,
            },
            [
              h(
                'span',
                { 'data-mol-id': 'video-scrubber-frame-current' },
                formatFrameNumber(currentFrame),
              ),
              h('span', { 'data-mol-id': 'video-scrubber-frame-total' }, [
                t(
                  'videoScrubber.frameReadout.total',
                  { total: totalFrames },
                  { defaultValue: '/ {{total}} frames' },
                ),
              ]),
            ],
          ),
        )
      }

      return h(
        'div',
        {
          id: props.id,
          role: 'group',
          'aria-label': rootLabel,
          'data-mol-id': 'video-scrubber',
          'data-fps': safeFps,
          'data-frame': currentFrame,
          class: cm.cn(props.className),
          style: rootStyle,
        },
        children,
      )
    }
  },
})
