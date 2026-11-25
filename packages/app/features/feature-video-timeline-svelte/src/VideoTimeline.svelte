<!--
  VideoTimeline: the Svelte counterpart of
  `@molecule/app-feature-video-timeline-react`'s `VideoTimeline` — a
  multi-track video timeline composing one `<TrackLane>` per track row with a
  shared time ruler, playhead, zoom slider + Ctrl+wheel zoom, and ripple/insert
  edit modes. Same props (React names), same DOM for the same input, same
  callback calls; every visible string comes from `useTranslation()` so a
  locale switch re-renders it.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import { clipToPixels, pixelsToTime, TrackLane } from '@molecule/app-feature-track-lane-svelte'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { createRulerScrub, listenForWheelZoom, type ZoomStep } from './interaction.js'
  import {
    clampZoom,
    computeRippleUpdates,
    computeRulerTicks,
    DEFAULT_LANE_HEADER_WIDTH,
    DEFAULT_PIXELS_PER_SECOND,
    DEFAULT_RULER_HEIGHT,
    DEFAULT_TRACK_HEIGHT,
    DEFAULT_ZOOM_MAX,
    DEFAULT_ZOOM_MIN,
    formatTickTime,
    zoomFromWheelDelta,
  } from './timeline.js'
  import type { Track, TrackKind, VideoTimelineMode, VideoTimelineProps } from './types.js'

  let {
    tracks,
    currentTime,
    duration,
    onSeek,
    onClipMove,
    onClipResize,
    pixelsPerSecond,
    zoomMin,
    zoomMax,
    mode,
    onZoomChange,
    selectedClipId,
    onClipClick,
    trackHeight,
    laneHeaderWidth,
    rulerHeight,
    className,
  }: VideoTimelineProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** The scrollable tracks area, where the Ctrl-wheel shortcut listens. */
  let tracksBody: HTMLDivElement | undefined = $state()

  const safeDuration = $derived(duration > 0 ? duration : 0)
  const safeScale = $derived(
    (pixelsPerSecond ?? DEFAULT_PIXELS_PER_SECOND) > 0
      ? (pixelsPerSecond ?? DEFAULT_PIXELS_PER_SECOND)
      : 1,
  )
  const zoomMinOf = $derived(zoomMin ?? DEFAULT_ZOOM_MIN)
  const zoomMaxOf = $derived(zoomMax ?? DEFAULT_ZOOM_MAX)
  const modeOf = $derived<VideoTimelineMode>(mode ?? 'ripple')
  const trackHeightOf = $derived(trackHeight ?? DEFAULT_TRACK_HEIGHT)
  const laneHeaderWidthOf = $derived(laneHeaderWidth ?? DEFAULT_LANE_HEADER_WIDTH)
  const rulerHeightOf = $derived(rulerHeight ?? DEFAULT_RULER_HEIGHT)
  const bodyWidth = $derived(Math.max(0, safeDuration * safeScale))
  const ticks = $derived(computeRulerTicks(safeDuration, safeScale))
  const playheadPx = $derived(clipToPixels({ startTime: currentTime, duration: 0 }, safeScale).left)
  const sliderValue = $derived(Math.round(clampZoom(safeScale, zoomMinOf, zoomMaxOf)))

  const rulerLabel = $derived(t('videoTimeline.aria.ruler', {}, { defaultValue: 'Time ruler' }))
  const playheadLabel = $derived(
    t(
      'videoTimeline.aria.playhead',
      { time: currentTime.toFixed(2) },
      { defaultValue: 'Playhead at {{time}}s' },
    ),
  )
  const zoomLabel = $derived(t('videoTimeline.aria.zoom', {}, { defaultValue: 'Timeline zoom' }))
  const zoomInLabel = $derived(t('videoTimeline.zoom.in', {}, { defaultValue: 'Zoom in' }))
  const zoomOutLabel = $derived(t('videoTimeline.zoom.out', {}, { defaultValue: 'Zoom out' }))
  const modeLabel = $derived(t('videoTimeline.aria.mode', {}, { defaultValue: 'Edit mode' }))
  const rootLabel = $derived(t('videoTimeline.aria.root', {}, { defaultValue: 'Video timeline' }))
  const modeText = $derived(
    modeOf === 'ripple'
      ? t('videoTimeline.mode.ripple', {}, { defaultValue: 'Ripple' })
      : t('videoTimeline.mode.insert', {}, { defaultValue: 'Insert' }),
  )
  const zoomOutIcon = $derived(t('videoTimeline.zoom.out.icon', {}, { defaultValue: '−' }))
  const zoomInIcon = $derived(t('videoTimeline.zoom.in.icon', {}, { defaultValue: '+' }))

  /**
   * The translated label of one track kind (React's `trackKindLabel`).
   *
   * @param kind - The track kind.
   * @returns The translated kind label.
   */
  function trackKindLabel(kind: TrackKind): string {
    switch (kind) {
      case 'video':
        return t('videoTimeline.trackKind.video', {}, { defaultValue: 'Video' })
      case 'audio':
        return t('videoTimeline.trackKind.audio', {}, { defaultValue: 'Audio' })
      case 'subtitle':
        return t('videoTimeline.trackKind.subtitle', {}, { defaultValue: 'Subtitle' })
    }
  }

  /**
   * The lane name React passes to `<TrackLane>`: the track's name, or the
   * translated kind label.
   *
   * @param track - The track row.
   * @returns The lane name.
   */
  function laneName(track: Track): string {
    return track.name ?? trackKindLabel(track.kind)
  }

  /**
   * Convert a pointer's horizontal offset from the ruler's left edge to a
   * time value, clamped into `[0, duration]`.
   *
   * @param x - The pointer's offset into the ruler body, in pixels.
   */
  function seekAt(x: number): void {
    onSeek?.(Math.min(pixelsToTime(x, safeScale), safeDuration))
  }

  /** The ruler scrub (React's `drag` on the ruler `Box`). */
  const scrub = createRulerScrub(seekAt, () => onSeek !== undefined)

  /**
   * Apply one zoom step of the wheel factor. The zoom buttons use it too;
   * they also report when the scale is already at the bound.
   *
   * @param direction - Which way to step.
   * @param notifyAtLimit - Whether to report a step that stays at the bound.
   */
  function stepZoom(direction: ZoomStep, notifyAtLimit = false): void {
    const next = zoomFromWheelDelta(safeScale, direction === 'in' ? -1 : 1, zoomMinOf, zoomMaxOf)
    if (notifyAtLimit || next !== safeScale) onZoomChange?.(next)
  }

  // Ctrl+wheel over the tracks zooms; plain wheel scrolls the tracks. The shortcut listens
  // once the tracks area exists and a zoom handler is given, and stops when either goes away.
  $effect(() => {
    if (!tracksBody || !onZoomChange) return
    return listenForWheelZoom(tracksBody, (direction) => stepZoom(direction))
  })

  // A scrub in progress ends when the ruler stops seeking, and when the timeline goes away.
  $effect(() => {
    if (onSeek === undefined) scrub.end()
  })
  onDestroy(() => scrub.end())

  /**
   * Forward a track-lane clip move to `onClipMove`, fanning out via
   * `computeRippleUpdates` when in `'ripple'` mode.
   *
   * @param trackId - The track id forwarded as the lane id.
   * @param clipId - The id of the dragged clip.
   * @param proposedStartTime - The candidate new `startTime`.
   */
  function handleClipMove(trackId: string, clipId: string, proposedStartTime: number): void {
    if (!onClipMove) return
    const track = (tracks ?? []).find((tr) => tr.id === trackId)
    if (!track) {
      onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    if (modeOf === 'insert') {
      onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    const updates = computeRippleUpdates(track.clips, clipId, proposedStartTime)
    for (const u of updates) onClipMove(u.id, u.startTime, trackId)
  }

  /**
   * The zoom slider's `input` handler: emits the clamped value, then
   * applies React's controlled-input restore (the DOM value returns to
   * the prop).
   *
   * @param event - The native input event.
   */
  function handleZoomInput(event: Event): void {
    const element = event.target as HTMLInputElement
    onZoomChange?.(clampZoom(Number(element.value), zoomMinOf, zoomMaxOf))
    element.value = String(sliderValue)
  }

  /**
   * Applies React's controlled `value` to the zoom slider: the property AND
   * the content attribute (via the `defaultValue` property), re-applied when
   * the scale or the bounds change.
   *
   * @param node - The input element.
   * @param current - The controlled value.
   * @returns The action with an update that re-applies on prop changes.
   */
  function applySliderValue(
    node: HTMLInputElement,
    current: number,
  ): { update(next: number): void } {
    const apply = (text: string): void => {
      if (node.value !== text) node.value = text
      if (node.defaultValue !== text) node.defaultValue = text
    }
    apply(String(current))
    return { update: (next: number) => apply(String(next)) }
  }
</script>

<div
  role="group"
  aria-label={rootLabel}
  data-mol-id="video-timeline"
  data-mode={modeOf}
  class={cm.cn(className)}
  style="width: 100%; overflow: hidden"
>
  <div
    data-mol-id="video-timeline-controls"
    class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2))}
  >
    <!-- A generic span may not carry aria-label; the label is visually hidden text. -->
    <span data-mol-id="video-timeline-mode"
      ><span class={cm.cn(cm.srOnly)}>{modeLabel}</span>{modeText}</span
    >
    <button
      type="button"
      data-mol-id="video-timeline-zoom-out"
      aria-label={zoomOutLabel}
      class={cm.cn(cm.cursorPointer)}
      onclick={() => stepZoom('out', true)}>{zoomOutIcon}</button
    >
    <input
      type="range"
      data-mol-id="video-timeline-zoom-slider"
      aria-label={zoomLabel}
      min={zoomMinOf}
      max={zoomMaxOf}
      step={1}
      use:applySliderValue={sliderValue}
      oninput={handleZoomInput}
    />
    <button
      type="button"
      data-mol-id="video-timeline-zoom-in"
      aria-label={zoomInLabel}
      class={cm.cn(cm.cursorPointer)}
      onclick={() => stepZoom('in', true)}>{zoomInIcon}</button
    >
  </div>

  <div
    data-mol-id="video-timeline-ruler-row"
    style={`display: flex; align-items: stretch; height: ${rulerHeightOf}px; min-height: ${rulerHeightOf}px; position: relative`}
  >
    <div
      data-mol-id="video-timeline-ruler-header"
      style={`width: ${laneHeaderWidthOf}px; min-width: ${laneHeaderWidthOf}px; box-sizing: border-box`}
    ></div>
    <div
      role="slider"
      tabindex="0"
      aria-label={rulerLabel}
      aria-valuemin="0"
      aria-valuemax={safeDuration}
      aria-valuenow={currentTime}
      aria-valuetext={playheadLabel}
      data-mol-id="video-timeline-ruler"
      style={`flex: 1 1 auto; position: relative; height: ${rulerHeightOf}px; min-width: ${bodyWidth}px; overflow: hidden; cursor: ${onSeek ? 'pointer' : 'default'}; touch-action: none`}
      onpointerdown={(event) => scrub.press(event)}
    >
      {#each ticks as tick (tick.time)}
        <div>
          <div
            data-mol-id="video-timeline-tick"
            data-time={tick.time}
            style={`position: absolute; left: ${tick.pixel}px; top: 0px; bottom: 0px; width: 1px; background: var(--mol-video-timeline-tick, rgba(127, 127, 127, 0.5)); pointer-events: none`}
          ></div>
          <span
            data-mol-id="video-timeline-tick-label"
            data-time={tick.time}
            style={`position: absolute; left: ${tick.pixel + 2}px; top: 2px; font-size: 10px; pointer-events: none`}
            >{formatTickTime(tick.time)}</span
          >
        </div>
      {/each}
      <div
        data-mol-id="video-timeline-playhead-ruler"
        aria-hidden="true"
        style={`position: absolute; top: 0px; bottom: 0px; width: 2px; left: ${playheadPx}px; background: var(--mol-video-timeline-playhead, #ff3b30); pointer-events: none`}
      ></div>
    </div>
  </div>

  <div
    bind:this={tracksBody}
    data-mol-id="video-timeline-tracks"
    style="position: relative; overflow-x: auto; overflow-y: auto; width: 100%"
  >
    <div style={`position: relative; min-width: ${bodyWidth + laneHeaderWidthOf}px`}>
      {#each tracks ?? [] as track (track.id)}
        <div
          data-mol-id="video-timeline-track"
          data-track-id={track.id}
          data-track-kind={track.kind}
        >
          <TrackLane
            name={laneName(track)}
            clips={track.clips}
            pixelsPerSecond={safeScale}
            height={trackHeightOf}
            lane={track.id}
            {selectedClipId}
            onClipMove={(clipId, startTime) => handleClipMove(track.id, clipId, startTime)}
            onClipResize={(clipId, dur) => onClipResize?.(clipId, dur, track.id)}
            onClipClick={(clipId) => onClipClick?.(clipId, track.id)}
          />
        </div>
      {/each}
      <div
        data-mol-id="video-timeline-playhead"
        aria-hidden="true"
        style={`position: absolute; top: 0px; bottom: 0px; width: 2px; left: ${playheadPx + laneHeaderWidthOf}px; background: var(--mol-video-timeline-playhead, #ff3b30); pointer-events: none; z-index: 2`}
      ></div>
    </div>
  </div>
</div>
