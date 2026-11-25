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
  import { type ElementDrag, type ElementDragPoint, getClassMap } from '@molecule/app-ui'
  import { webDrag } from '@molecule/app-ui-svelte'

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
  function seekAt({ x, bounds }: ElementDragPoint): void {
    const ratio = bounds.width > 0 ? Math.max(0, Math.min(1, x / bounds.width)) : 0
    onSeek?.(snapTimeToFrame(ratio * safeDuration, safeFps, safeDuration))
  }

  const stripDrag: ElementDrag = { axis: 'horizontal', onStart: seekAt, onMove: seekAt }

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
    use:webDrag={interactive ? stripDrag : undefined}
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
