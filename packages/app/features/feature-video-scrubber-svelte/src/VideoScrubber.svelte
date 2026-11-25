<!--
  VideoScrubber: the Svelte counterpart of
  `@molecule/app-feature-video-scrubber-react`'s `VideoScrubber` — an
  evenly-spaced thumbnail filmstrip, a vertical playhead, click-to-seek
  scrubbing, frame-by-frame keyboard stepping and an optional frame-number
  readout. Same props (React names), same DOM for the same input, same
  callback calls; every visible string comes from `useTranslation()` so a
  locale switch re-renders it.

  The template's whitespace is deliberate: every element sits adjacent to the
  next with no whitespace-only text between siblings React does not render.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { VideoScrubberProps } from './types.js'
  import {
    computeFilmstripTicks,
    DEFAULT_FPS,
    DEFAULT_THUMBNAIL_COUNT,
    DEFAULT_THUMBNAIL_HEIGHT,
    formatFrameNumber,
    frameToTime,
    selectClosestThumbnail,
    snapTimeToFrame,
    timeToFrame,
  } from './utilities.js'

  let {
    duration,
    currentTime,
    fps = DEFAULT_FPS,
    thumbnails,
    onSeek,
    showFrameNumber = true,
    thumbnailCount = DEFAULT_THUMBNAIL_COUNT,
    thumbnailHeight = DEFAULT_THUMBNAIL_HEIGHT,
    id,
    className,
  }: VideoScrubberProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

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

  /** The contact in progress, or null. */
  let contact: Contact | null = null
  /** The mounted strip element, whose bounding box maps a pointer to a time. */
  let stripNode: HTMLDivElement | undefined = $state()

  const safeFps = $derived(Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS)
  const safeDuration = $derived(Number.isFinite(duration) && duration > 0 ? duration : 0)
  const clampedTime = $derived(
    (() => {
      const time = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0
      return time > safeDuration ? safeDuration : time
    })(),
  )
  const currentFrame = $derived(timeToFrame(clampedTime, safeFps))
  const totalFrames = $derived(timeToFrame(safeDuration, safeFps))
  const playheadPosition = $derived(safeDuration > 0 ? clampedTime / safeDuration : 0)
  const interactive = $derived(typeof onSeek === 'function')
  const ticks = $derived(computeFilmstripTicks(safeDuration, thumbnailCount))

  /**
   * Pick the closest thumbnail's src for a tick time, or empty string when no
   * thumbnails are available.
   *
   * @param cellTime - Tick time in seconds.
   * @returns The thumbnail src or empty string.
   */
  function cellThumbnail(cellTime: number): string {
    if (!thumbnails || thumbnails.length === 0) return ''
    return selectClosestThumbnail(thumbnails, cellTime)?.src ?? ''
  }

  /**
   * Seek to the nearest frame at the contact's horizontal position.
   *
   * @param point - The contact in strip coordinates.
   */
  function seekAt({ x, bounds }: SeekPoint): void {
    const ratio = bounds.width > 0 ? Math.max(0, Math.min(1, x / bounds.width)) : 0
    onSeek?.(snapTimeToFrame(ratio * safeDuration, safeFps, safeDuration))
  }

  /**
   * End the contact in progress, as when the strip stops being seekable or the
   * scrubber unmounts under a held pointer.
   */
  function endContact(): void {
    contact?.cancel()
  }

  /**
   * Begin a contact on the strip body: seek at the press, then keep following that
   * one pointer wherever it moves in the window until it is released or interrupted.
   *
   * @param event - The native pointer event from the strip body.
   */
  function onStripPointerDown(event: PointerEvent): void {
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
  $effect(() => {
    if (!interactive) return
    return endContact
  })

  /**
   * Handle keyboard scrubbing. ←/→ step ±1 frame; Shift+←/→ step ±1 second.
   * Home/End jump to start/end. PageUp/PageDown step ±10 frames. Always emits
   * a frame-snapped, clamped time via `onSeek`.
   *
   * @param event - The native keyboard event.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (typeof onSeek !== 'function') return
    const frame = timeToFrame(clampedTime, safeFps)
    const { key, shiftKey } = event
    let next: number | null = null
    if (key === 'ArrowLeft') {
      next = shiftKey ? clampedTime - 1 : frameToTime(frame - 1, safeFps)
    } else if (key === 'ArrowRight') {
      next = shiftKey ? clampedTime + 1 : frameToTime(frame + 1, safeFps)
    } else if (key === 'PageUp') {
      next = frameToTime(frame - 10, safeFps)
    } else if (key === 'PageDown') {
      next = frameToTime(frame + 10, safeFps)
    } else if (key === 'Home') {
      next = 0
    } else if (key === 'End') {
      next = safeDuration
    }
    if (next === null) return
    event.preventDefault()
    onSeek(snapTimeToFrame(next, safeFps, safeDuration))
  }

  /**
   * The strip body's inline style (React's `stripBodyStyle`).
   *
   * @param height - Filmstrip cell height in px.
   * @param seekable - Whether `onSeek` is set.
   * @returns The style declarations.
   */
  function stripBodyStyle(height: number, seekable: boolean): string {
    return [
      'position: relative',
      'display: flex',
      'width: 100%',
      `height: ${height}px`,
      'overflow: hidden',
      `cursor: ${seekable ? 'pointer' : 'default'}`,
      'touch-action: none',
      'user-select: none',
    ].join('; ')
  }

  /**
   * One filmstrip cell's inline style (React's `cellStyle`).
   *
   * @param src - The thumbnail src, or empty string.
   * @returns The style declarations.
   */
  function cellStyle(src: string): string {
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
   * The playhead's inline style (React's `playheadStyle`).
   *
   * @param position - Playhead position, 0..1.
   * @returns The style declarations.
   */
  function playheadStyle(position: number): string {
    return [
      'position: absolute',
      'top: 0px',
      'bottom: 0px',
      'width: 2px',
      `left: ${position * 100}%`,
      'transform: translateX(-1px)',
      'background: var(--mol-video-scrubber-playhead, #ff3b30)',
      'pointer-events: none',
      'z-index: 2',
    ].join('; ')
  }
</script>

<div
  {id}
  role="group"
  aria-label={t('videoScrubber.aria.root', {}, { defaultValue: 'Video scrubber' })}
  data-mol-id="video-scrubber"
  data-fps={safeFps}
  data-frame={currentFrame}
  class={cm.cn(className)}
  style="width: 100%; box-sizing: border-box"
>
  <div
    bind:this={stripNode}
    role="slider"
    tabindex="0"
    aria-label={t(
      'videoScrubber.aria.strip',
      { time: clampedTime.toFixed(2), frame: currentFrame },
      { defaultValue: 'Filmstrip — playhead at {{time}}s (frame {{frame}})' },
    )}
    aria-valuemin="0"
    aria-valuemax={safeDuration}
    aria-valuenow={clampedTime}
    data-mol-id="video-scrubber-strip"
    style={stripBodyStyle(thumbnailHeight, interactive)}
    onpointerdown={interactive ? onStripPointerDown : undefined}
    onkeydown={onKeyDown}
  >
    {#each ticks as tk, i (i)}<div
        data-mol-id="video-scrubber-cell"
        data-time={tk.time}
        data-index={i}
        role="img"
        aria-label={cellThumbnail(tk.time)
          ? t('videoScrubber.aria.thumbnail', {}, { defaultValue: 'Frame preview' })
          : t('videoScrubber.thumbnails.empty', {}, { defaultValue: 'No preview' })}
        style={cellStyle(cellThumbnail(tk.time))}
      ></div>{/each}
    <div
      data-mol-id="video-scrubber-playhead"
      aria-label={t(
        'videoScrubber.aria.playhead',
        { time: clampedTime.toFixed(2) },
        { defaultValue: 'Playhead at {{time}}s' },
      )}
      style={playheadStyle(playheadPosition)}
    ></div>
  </div>
  {#if showFrameNumber}<div
      data-mol-id="video-scrubber-frame-readout"
      aria-label={t(
        'videoScrubber.aria.frameReadout',
        { frame: currentFrame, total: totalFrames },
        { defaultValue: 'Frame {{frame}} of {{total}}' },
      )}
      class={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('p', 1))}
      style="font-variant-numeric: tabular-nums"
    >
      <span data-mol-id="video-scrubber-frame-current">{formatFrameNumber(currentFrame)}</span><span
        data-mol-id="video-scrubber-frame-total"
        >{t(
          'videoScrubber.frameReadout.total',
          { total: totalFrames },
          { defaultValue: '/ {{total}} frames' },
        )}</span
      >
    </div>{/if}
</div>
