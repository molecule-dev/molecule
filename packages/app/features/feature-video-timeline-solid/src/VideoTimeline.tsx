/**
 * Solid multi-track video timeline: one `<TrackLane>` row per track with a
 * shared time ruler, playhead, zoom slider + Ctrl+wheel zoom, and ripple /
 * insert edit modes.
 *
 * Solid counterpart of `@molecule/app-feature-video-timeline-react`'s
 * `VideoTimeline` — the same props (React names), the same DOM for the same
 * input, and the same callback calls.
 *
 * @module
 */

import { type Component, createEffect, createMemo, For, type JSX, Show } from 'solid-js'

import { clipToPixels, pixelsToTime, TrackLane } from '@molecule/app-feature-track-lane-solid'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

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
  ZOOM_WHEEL_FACTOR,
  zoomFromWheelDelta,
} from './timeline.js'
import type { Track, TrackKind, VideoTimelineMode, VideoTimelineProps } from './types.js'

/** The ruler scrub in progress, or null. */
interface SeekDragState {
  /** The pointer that started the scrub. */
  pointerId: number
}

/** A track row identity record: created once per track id and reused while the id is present. */
interface TrackRow {
  id: string
}

/**
 * Multi-track video timeline. Composes one `<TrackLane>` per track with
 * a shared time ruler at the top, a vertical playhead, and a zoom slider
 * row. Pointer-down on the ruler scrubs `onSeek`; Ctrl+wheel anywhere
 * over the body changes zoom; the slider is keyboard-accessible.
 *
 * In `'ripple'` mode (default), dragging a clip on a lane shifts every
 * subsequent clip on that lane by the same delta — `onClipMove` is
 * called once per affected clip. In `'insert'` mode, only the dragged
 * clip moves.
 *
 * React keys each track row by its `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so
 * the rows are keyed through stable per-id records: the record for an id is
 * created once and reused, while the row's content reads the CURRENT track
 * for that id reactively.
 *
 * @param props - Component props (see {@link VideoTimelineProps}).
 * @returns The multi-track timeline.
 */
export const VideoTimeline: Component<VideoTimelineProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** The ruler body element, for the pointer-to-time math. */
  let rulerBody: HTMLDivElement | undefined
  /** The zoom slider element, for React's controlled-value restore. */
  let sliderEl: HTMLInputElement | undefined
  /** The ruler scrub in progress, or null. */
  let seekDrag: SeekDragState | null = null

  /** The duration clamped to >= 0 (React's `safeDuration`). */
  const safeDuration = (): number => (props.duration > 0 ? props.duration : 0)
  /** The horizontal scale in effect (default 20). */
  const scaleOf = (): number => props.pixelsPerSecond ?? DEFAULT_PIXELS_PER_SECOND
  /** The scale clamped to >= 1 (React's `safeScale`). */
  const safeScale = (): number => (scaleOf() > 0 ? scaleOf() : 1)
  /** The lower zoom bound in effect (default 2). */
  const zoomMinOf = (): number => props.zoomMin ?? DEFAULT_ZOOM_MIN
  /** The upper zoom bound in effect (default 200). */
  const zoomMaxOf = (): number => props.zoomMax ?? DEFAULT_ZOOM_MAX
  /** The edit mode in effect (default `'ripple'`). */
  const modeOf = (): VideoTimelineMode => props.mode ?? 'ripple'
  /** The lane row height in effect (default 44). */
  const trackHeightOf = (): number => props.trackHeight ?? DEFAULT_TRACK_HEIGHT
  /** The lane-header column width in effect (default 120). */
  const laneHeaderWidthOf = (): number => props.laneHeaderWidth ?? DEFAULT_LANE_HEADER_WIDTH
  /** The ruler row height in effect (default 28). */
  const rulerHeightOf = (): number => props.rulerHeight ?? DEFAULT_RULER_HEIGHT

  /** The scrollable body's content width in pixels (React's `bodyWidth`). */
  const bodyWidth = (): number => Math.max(0, safeDuration() * safeScale())

  /** The ruler ticks, recomputed only when the duration or scale changes. */
  const ticks = createMemo(() => computeRulerTicks(safeDuration(), safeScale()))

  /** One stable record per track id, created on first sight. */
  const records = new Map<string, TrackRow>()
  /**
   * The rows to render, keyed by their stable per-id records.
   *
   * @returns One record per current track, in display order.
   */
  const keyedTracks = (): TrackRow[] => {
    const seen = new Set<string>()
    const rows = (props.tracks ?? []).map((track) => {
      seen.add(track.id)
      let row = records.get(track.id)
      if (!row) {
        row = { id: track.id }
        records.set(track.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current track for one row id.
   *
   * @param id - The track id.
   * @returns The track, or undefined while it is absent.
   */
  const trackFor = (id: string): Track | undefined =>
    (props.tracks ?? []).find((track) => track.id === id)

  /** The playhead's pixel offset on the time axis (React's `playheadPx`). */
  const playheadPx = (): number =>
    clipToPixels({ startTime: props.currentTime, duration: 0 }, safeScale()).left

  /** The displayed zoom slider value (React's rounded, clamped scale). */
  const sliderValue = (): number => Math.round(clampZoom(safeScale(), zoomMinOf(), zoomMaxOf()))

  /** The translated ruler label (React's `videoTimeline.aria.ruler`). */
  const rulerLabel = (): string => t('videoTimeline.aria.ruler', {}, { defaultValue: 'Time ruler' })
  /** The translated playhead label (React's `videoTimeline.aria.playhead`). */
  const playheadLabel = (): string =>
    t(
      'videoTimeline.aria.playhead',
      { time: props.currentTime.toFixed(2) },
      { defaultValue: 'Playhead at {{time}}s' },
    )
  /** The translated zoom slider label (React's `videoTimeline.aria.zoom`). */
  const zoomLabel = (): string =>
    t('videoTimeline.aria.zoom', {}, { defaultValue: 'Timeline zoom' })
  /** The translated zoom-in label (React's `videoTimeline.zoom.in`). */
  const zoomInLabel = (): string => t('videoTimeline.zoom.in', {}, { defaultValue: 'Zoom in' })
  /** The translated zoom-out label (React's `videoTimeline.zoom.out`). */
  const zoomOutLabel = (): string => t('videoTimeline.zoom.out', {}, { defaultValue: 'Zoom out' })
  /** The translated mode label (React's `videoTimeline.aria.mode`). */
  const modeLabel = (): string => t('videoTimeline.aria.mode', {}, { defaultValue: 'Edit mode' })
  /** The translated root label (React's `videoTimeline.aria.root`). */
  const rootLabel = (): string =>
    t('videoTimeline.aria.root', {}, { defaultValue: 'Video timeline' })
  /** The visible mode text (React's ripple/insert branch). */
  const modeText = (): string =>
    modeOf() === 'ripple'
      ? t('videoTimeline.mode.ripple', {}, { defaultValue: 'Ripple' })
      : t('videoTimeline.mode.insert', {}, { defaultValue: 'Insert' })
  /** The translated zoom-out glyph (React's `videoTimeline.zoom.out.icon`). */
  const zoomOutIcon = (): string => t('videoTimeline.zoom.out.icon', {}, { defaultValue: '−' })
  /** The translated zoom-in glyph (React's `videoTimeline.zoom.in.icon`). */
  const zoomInIcon = (): string => t('videoTimeline.zoom.in.icon', {}, { defaultValue: '+' })

  /**
   * The translated label of one track kind (React's `trackKindLabel`).
   *
   * @param kind - The track kind.
   * @returns The translated kind label.
   */
  const trackKindLabel = (kind: TrackKind): string => {
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
  const laneName = (track: Track): JSX.Element => track.name ?? trackKindLabel(track.kind)

  /**
   * Convert a pointer's clientX (relative to the ruler body) to a time
   * value, clamped into `[0, duration]`.
   *
   * @param clientX - Pointer clientX in viewport coordinates.
   * @returns The seek time in seconds.
   */
  function clientXToTime(clientX: number): number {
    const el = rulerBody
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left
    const time = pixelsToTime(px, safeScale())
    if (time < 0) return 0
    if (time > safeDuration()) return safeDuration()
    return time
  }

  /**
   * Begin a ruler scrub. Subsequent pointermove events while the pointer
   * is captured will continue to fire `onSeek`.
   *
   * @param event - The pointer event from the ruler body.
   */
  function onRulerPointerDown(event: PointerEvent): void {
    if (event.button !== undefined && event.button !== 0) return
    if (!props.onSeek) return
    seekDrag = { pointerId: event.pointerId }
    try {
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // jsdom doesn't always implement setPointerCapture; ignore.
    }
    props.onSeek(clientXToTime(event.clientX))
  }

  /**
   * Continue a ruler scrub.
   *
   * @param event - The pointer event from the ruler body.
   */
  function onRulerPointerMove(event: PointerEvent): void {
    const drag = seekDrag
    if (!drag || drag.pointerId !== event.pointerId) return
    props.onSeek?.(clientXToTime(event.clientX))
  }

  /**
   * Finish a ruler scrub.
   *
   * @param event - The pointer event from the ruler body.
   */
  function onRulerPointerUp(event: PointerEvent): void {
    const drag = seekDrag
    if (!drag || drag.pointerId !== event.pointerId) return
    seekDrag = null
    try {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    } catch (_error) {
      // releasePointerCapture may throw in jsdom/headless; pointer state already cleared above.
    }
  }

  /**
   * Handle Ctrl+wheel zoom. Plain wheel scrolls the body; Ctrl+wheel
   * (or pinch-zoom on macOS, which surfaces as ctrlKey) zooms.
   *
   * @param event - The wheel event from the tracks area.
   */
  function onBodyWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return
    if (!props.onZoomChange) return
    event.preventDefault()
    const next = zoomFromWheelDelta(safeScale(), event.deltaY, zoomMinOf(), zoomMaxOf())
    if (next !== safeScale()) props.onZoomChange(next)
  }

  /**
   * Forward a track-lane clip move to `onClipMove`, fanning out via
   * `computeRippleUpdates` when in `'ripple'` mode.
   *
   * @param trackId - The track id forwarded as the lane id.
   * @param clipId - The id of the dragged clip.
   * @param proposedStartTime - The candidate new `startTime`.
   */
  function handleClipMove(trackId: string, clipId: string, proposedStartTime: number): void {
    if (!props.onClipMove) return
    const track = (props.tracks ?? []).find((tr) => tr.id === trackId)
    if (!track) {
      props.onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    if (modeOf() === 'insert') {
      props.onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    const updates = computeRippleUpdates(track.clips, clipId, proposedStartTime)
    for (const u of updates) props.onClipMove(u.id, u.startTime, trackId)
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
    props.onZoomChange?.(clampZoom(Number(element.value), zoomMinOf(), zoomMaxOf()))
    element.value = String(sliderValue())
  }

  // React's controlled `value` on the zoom slider: the property AND the
  // `value` attribute (its `defaultValue`), re-applied whenever the scale
  // or the bounds change.
  createEffect(() => {
    const element = sliderEl
    if (!element) return
    const text = String(sliderValue())
    if (element.value !== text) element.value = text
    if (element.defaultValue !== text) element.defaultValue = text
  })

  /** The playhead's shared inline geometry (position + fill). */
  const playheadShared: JSX.CSSProperties = {
    position: 'absolute',
    top: '0px',
    bottom: '0px',
    width: '2px',
    background: 'var(--mol-video-timeline-playhead, #ff3b30)',
    'pointer-events': 'none',
  }

  return (
    <div
      role="group"
      aria-label={rootLabel()}
      data-mol-id="video-timeline"
      data-mode={modeOf()}
      class={cm.cn(props.className)}
      style={{ width: '100%', overflow: 'hidden' }}
    >
      {/* Zoom + mode controls row */}
      <div
        data-mol-id="video-timeline-controls"
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2))}
      >
        <span data-mol-id="video-timeline-mode">
          {/* A generic span may not carry aria-label; the label is visually hidden text. */}
          <span class={cm.cn(cm.srOnly)}>{modeLabel()}</span>
          {modeText()}
        </span>
        <button
          type="button"
          data-mol-id="video-timeline-zoom-out"
          aria-label={zoomOutLabel()}
          class={cm.cn(cm.cursorPointer)}
          onClick={() =>
            props.onZoomChange?.(
              clampZoom(safeScale() / ZOOM_WHEEL_FACTOR, zoomMinOf(), zoomMaxOf()),
            )
          }
        >
          {zoomOutIcon()}
        </button>
        <input
          ref={(element) => {
            sliderEl = element
          }}
          type="range"
          data-mol-id="video-timeline-zoom-slider"
          aria-label={zoomLabel()}
          min={zoomMinOf()}
          max={zoomMaxOf()}
          step={1}
          onInput={handleZoomInput}
        />
        <button
          type="button"
          data-mol-id="video-timeline-zoom-in"
          aria-label={zoomInLabel()}
          class={cm.cn(cm.cursorPointer)}
          onClick={() =>
            props.onZoomChange?.(
              clampZoom(safeScale() * ZOOM_WHEEL_FACTOR, zoomMinOf(), zoomMaxOf()),
            )
          }
        >
          {zoomInIcon()}
        </button>
      </div>

      {/* Ruler row */}
      <div
        data-mol-id="video-timeline-ruler-row"
        style={{
          display: 'flex',
          'align-items': 'stretch',
          height: `${rulerHeightOf()}px`,
          'min-height': `${rulerHeightOf()}px`,
          position: 'relative',
        }}
      >
        <div
          data-mol-id="video-timeline-ruler-header"
          style={{
            width: `${laneHeaderWidthOf()}px`,
            'min-width': `${laneHeaderWidthOf()}px`,
            'box-sizing': 'border-box',
          }}
        />
        <div
          ref={(element) => {
            rulerBody = element
          }}
          role="slider"
          tabIndex={0}
          aria-label={rulerLabel()}
          aria-valuemin={0}
          aria-valuemax={safeDuration()}
          aria-valuenow={props.currentTime}
          aria-valuetext={playheadLabel()}
          data-mol-id="video-timeline-ruler"
          style={{
            flex: '1 1 auto',
            position: 'relative',
            height: `${rulerHeightOf()}px`,
            'min-width': `${bodyWidth()}px`,
            overflow: 'hidden',
            cursor: props.onSeek ? 'pointer' : 'default',
            'touch-action': 'none',
          }}
          onPointerDown={onRulerPointerDown}
          onPointerMove={onRulerPointerMove}
          onPointerUp={onRulerPointerUp}
          onPointerCancel={onRulerPointerUp}
        >
          <For each={ticks()}>
            {(tk) => (
              <div>
                <div
                  data-mol-id="video-timeline-tick"
                  data-time={tk.time}
                  style={{
                    position: 'absolute',
                    left: `${tk.pixel}px`,
                    top: '0px',
                    bottom: '0px',
                    width: '1px',
                    background: 'var(--mol-video-timeline-tick, rgba(127, 127, 127, 0.5))',
                    'pointer-events': 'none',
                  }}
                />
                <span
                  data-mol-id="video-timeline-tick-label"
                  data-time={tk.time}
                  style={{
                    position: 'absolute',
                    left: `${tk.pixel + 2}px`,
                    top: '2px',
                    'font-size': '10px',
                    'pointer-events': 'none',
                  }}
                >
                  {formatTickTime(tk.time)}
                </span>
              </div>
            )}
          </For>
          <div
            data-mol-id="video-timeline-playhead-ruler"
            aria-hidden="true"
            style={{ ...playheadShared, left: `${playheadPx()}px` }}
          />
        </div>
      </div>

      {/* Tracks (scrollable) */}
      <div
        data-mol-id="video-timeline-tracks"
        style={{
          position: 'relative',
          'overflow-x': 'auto',
          'overflow-y': 'auto',
          width: '100%',
        }}
        onWheel={onBodyWheel}
      >
        <div
          style={{ position: 'relative', 'min-width': `${bodyWidth() + laneHeaderWidthOf()}px` }}
        >
          <For each={keyedTracks()}>
            {(row) => (
              <Show when={trackFor(row.id)}>
                {(track) => (
                  <div
                    data-mol-id="video-timeline-track"
                    data-track-id={track().id}
                    data-track-kind={track().kind}
                  >
                    <TrackLane
                      name={laneName(track())}
                      clips={track().clips}
                      pixelsPerSecond={safeScale()}
                      height={trackHeightOf()}
                      lane={track().id}
                      selectedClipId={props.selectedClipId}
                      onClipMove={(clipId, startTime) =>
                        handleClipMove(track().id, clipId, startTime)
                      }
                      onClipResize={(clipId, dur) => props.onClipResize?.(clipId, dur, track().id)}
                      onClipClick={(clipId) => props.onClipClick?.(clipId, track().id)}
                    />
                  </div>
                )}
              </Show>
            )}
          </For>
          <div
            data-mol-id="video-timeline-playhead"
            aria-hidden="true"
            style={{
              ...playheadShared,
              left: `${playheadPx() + laneHeaderWidthOf()}px`,
              'z-index': '2',
            }}
          />
        </div>
      </div>
    </div>
  )
}
