/**
 * Vue multi-track video timeline: one `<TrackLane>` row per track with a
 * shared time ruler, playhead, zoom slider + Ctrl+wheel zoom, and ripple /
 * insert edit modes.
 *
 * Vue counterpart of `@molecule/app-feature-video-timeline-react`'s
 * `VideoTimeline` — the same props (React names), the same DOM for the same
 * input, and the same callback calls.
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
  type VNodeChild,
  watch,
} from 'vue'

import { clipToPixels, pixelsToTime, TrackLane } from '@molecule/app-feature-track-lane-vue'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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
 * @param props - Component props (see {@link VideoTimelineProps}).
 * @returns The multi-track timeline component.
 */
export const VideoTimeline = defineComponent({
  name: 'VideoTimeline',
  props: {
    /** Tracks to render, in display order. */
    tracks: { type: Array as PropType<Track[]>, required: true },
    /** Current playhead time in seconds. */
    currentTime: { type: Number, required: true },
    /** Total timeline duration in seconds. */
    duration: { type: Number, required: true },
    /** Called when the user clicks/scrubs the ruler. */
    onSeek: {
      type: Function as PropType<VideoTimelineProps['onSeek']>,
      default: undefined,
    },
    /** Called when a clip on a lane is dragged horizontally. */
    onClipMove: {
      type: Function as PropType<VideoTimelineProps['onClipMove']>,
      default: undefined,
    },
    /** Called when a clip's right-edge resize handle is dragged. */
    onClipResize: {
      type: Function as PropType<VideoTimelineProps['onClipResize']>,
      default: undefined,
    },
    /** Horizontal scale (px per second), defaults to 20 (read at render time). */
    pixelsPerSecond: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Lower zoom bound, defaults to 2 (read at render time). */
    zoomMin: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Upper zoom bound, defaults to 200 (read at render time). */
    zoomMax: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Edit mode for clip drags, defaults to `'ripple'` (read at render time). */
    mode: {
      type: String as PropType<VideoTimelineMode | undefined>,
      default: undefined,
    },
    /** Called when the user changes the zoom (slider or Ctrl+wheel). */
    onZoomChange: {
      type: Function as PropType<VideoTimelineProps['onZoomChange']>,
      default: undefined,
    },
    /** Optional currently-selected clip id. */
    selectedClipId: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Called when a clip is clicked (no drag). */
    onClipClick: {
      type: Function as PropType<VideoTimelineProps['onClipClick']>,
      default: undefined,
    },
    /** Per-track row height in pixels, defaults to 44 (read at render time). */
    trackHeight: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Width of the leading lane-header column, defaults to 120 (read at render time). */
    laneHeaderWidth: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Height of the time ruler row, defaults to 28 (read at render time). */
    rulerHeight: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Extra classes merged onto the root element. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** The scrollable tracks area, where the Ctrl-wheel shortcut listens. */
    const tracksBody = ref<HTMLDivElement | null>(null)

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
    const ticks = computed(() => computeRulerTicks(safeDuration(), safeScale()))

    /** The playhead's pixel offset on the time axis (React's `playheadPx`). */
    const playheadPx = (): number =>
      clipToPixels({ startTime: props.currentTime, duration: 0 }, safeScale()).left

    /** The displayed zoom slider value (React's rounded, clamped scale). */
    const sliderValue = (): number => Math.round(clampZoom(safeScale(), zoomMinOf(), zoomMaxOf()))

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
    const laneName = (track: Track): VNodeChild => track.name ?? trackKindLabel(track.kind)

    /**
     * Convert a pointer's horizontal offset from the ruler's left edge to a
     * time value, clamped into `[0, duration]`.
     *
     * @param x - The pointer's offset into the ruler body, in pixels.
     */
    function seekAt(x: number): void {
      props.onSeek?.(Math.min(pixelsToTime(x, safeScale()), safeDuration()))
    }

    /** The ruler scrub (React's `drag` on the ruler `Box`). */
    const scrub = createRulerScrub(seekAt, () => Boolean(props.onSeek))

    /**
     * Apply one zoom step of the wheel factor. The zoom buttons use it too;
     * they also report when the scale is already at the bound.
     *
     * @param direction - Which way to step.
     * @param notifyAtLimit - Whether to report a step that stays at the bound.
     */
    function stepZoom(direction: ZoomStep, notifyAtLimit = false): void {
      const next = zoomFromWheelDelta(
        safeScale(),
        direction === 'in' ? -1 : 1,
        zoomMinOf(),
        zoomMaxOf(),
      )
      if (notifyAtLimit || next !== safeScale()) props.onZoomChange?.(next)
    }

    /** Removes the Ctrl-wheel shortcut's listener, while it is attached. */
    let detachWheelZoom: (() => void) | undefined

    /**
     * Attach the Ctrl-wheel shortcut while the tracks area and a zoom handler
     * are both there, and detach it otherwise.
     */
    function syncWheelZoom(): void {
      detachWheelZoom?.()
      detachWheelZoom = undefined
      const host = tracksBody.value
      if (host && props.onZoomChange) {
        detachWheelZoom = listenForWheelZoom(host, (direction) => stepZoom(direction))
      }
    }

    // A scrub in progress ends when the ruler stops seeking, and when the timeline goes away.
    watch(
      () => Boolean(props.onSeek),
      () => scrub.end(),
      { flush: 'sync' },
    )
    watch(() => Boolean(props.onZoomChange), syncWheelZoom, { flush: 'sync' })
    // The tracks area exists once the timeline is mounted.
    onMounted(syncWheelZoom)
    onBeforeUnmount(() => {
      detachWheelZoom?.()
      scrub.end()
    })

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

    return (): VNode => {
      const rulerHeight = rulerHeightOf()
      const laneHeaderWidth = laneHeaderWidthOf()
      const playhead = playheadPx()

      const rulerLabel = t('videoTimeline.aria.ruler', {}, { defaultValue: 'Time ruler' })
      const playheadLabel = t(
        'videoTimeline.aria.playhead',
        { time: props.currentTime.toFixed(2) },
        { defaultValue: 'Playhead at {{time}}s' },
      )
      const zoomLabel = t('videoTimeline.aria.zoom', {}, { defaultValue: 'Timeline zoom' })
      const zoomInLabel = t('videoTimeline.zoom.in', {}, { defaultValue: 'Zoom in' })
      const zoomOutLabel = t('videoTimeline.zoom.out', {}, { defaultValue: 'Zoom out' })
      const modeLabel = t('videoTimeline.aria.mode', {}, { defaultValue: 'Edit mode' })
      const rootLabel = t('videoTimeline.aria.root', {}, { defaultValue: 'Video timeline' })
      const modeText =
        modeOf() === 'ripple'
          ? t('videoTimeline.mode.ripple', {}, { defaultValue: 'Ripple' })
          : t('videoTimeline.mode.insert', {}, { defaultValue: 'Insert' })

      const playheadShared: CSSProperties = {
        position: 'absolute',
        top: '0px',
        bottom: '0px',
        width: '2px',
        background: 'var(--mol-video-timeline-playhead, #ff3b30)',
        pointerEvents: 'none',
      }

      const trackRows: VNodeChild[] = (props.tracks ?? []).map((track) =>
        h(
          'div',
          {
            key: track.id,
            'data-mol-id': 'video-timeline-track',
            'data-track-id': track.id,
            'data-track-kind': track.kind,
          },
          [
            h(TrackLane, {
              name: laneName(track),
              clips: track.clips,
              pixelsPerSecond: safeScale(),
              height: trackHeightOf(),
              lane: track.id,
              selectedClipId: props.selectedClipId,
              onClipMove: (clipId: string, startTime: number) =>
                handleClipMove(track.id, clipId, startTime),
              onClipResize: (clipId: string, dur: number) =>
                props.onClipResize?.(clipId, dur, track.id),
              onClipClick: (clipId: string) => props.onClipClick?.(clipId, track.id),
            }),
          ],
        ),
      )

      const tickNodes: VNodeChild[] = ticks.value.map((tk) =>
        h('div', { key: `tick-${tk.time}` }, [
          h('div', {
            'data-mol-id': 'video-timeline-tick',
            'data-time': tk.time,
            style: {
              position: 'absolute',
              left: `${tk.pixel}px`,
              top: '0px',
              bottom: '0px',
              width: '1px',
              background: 'var(--mol-video-timeline-tick, rgba(127, 127, 127, 0.5))',
              pointerEvents: 'none',
            } as CSSProperties,
          }),
          h(
            'span',
            {
              'data-mol-id': 'video-timeline-tick-label',
              'data-time': tk.time,
              style: {
                position: 'absolute',
                left: `${tk.pixel + 2}px`,
                top: '2px',
                fontSize: '10px',
                pointerEvents: 'none',
              } as CSSProperties,
            },
            [formatTickTime(tk.time)],
          ),
        ]),
      )

      return h(
        'div',
        {
          role: 'group',
          'aria-label': rootLabel,
          'data-mol-id': 'video-timeline',
          'data-mode': modeOf(),
          class: cm.cn(props.className),
          style: {
            width: '100%',
            overflow: 'hidden',
          } as CSSProperties,
        },
        [
          // Zoom + mode controls row.
          h(
            'div',
            {
              'data-mol-id': 'video-timeline-controls',
              class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2)),
            },
            [
              // A generic span may not carry aria-label; the label is visually
              // hidden text before the visible mode word.
              h('span', { 'data-mol-id': 'video-timeline-mode' }, [
                h('span', { class: cm.cn(cm.srOnly) }, [modeLabel]),
                modeText,
              ]),
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'video-timeline-zoom-out',
                  'aria-label': zoomOutLabel,
                  class: cm.cn(cm.cursorPointer),
                  onClick: () => stepZoom('out', true),
                },
                [t('videoTimeline.zoom.out.icon', {}, { defaultValue: '−' })],
              ),
              h('input', {
                type: 'range',
                'data-mol-id': 'video-timeline-zoom-slider',
                'aria-label': zoomLabel,
                min: zoomMinOf(),
                max: zoomMaxOf(),
                step: 1,
                value: String(sliderValue()),
                defaultValue: String(sliderValue()),
                onInput: handleZoomInput,
              }),
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'video-timeline-zoom-in',
                  'aria-label': zoomInLabel,
                  class: cm.cn(cm.cursorPointer),
                  onClick: () => stepZoom('in', true),
                },
                [t('videoTimeline.zoom.in.icon', {}, { defaultValue: '+' })],
              ),
            ],
          ),
          // Ruler row.
          h(
            'div',
            {
              'data-mol-id': 'video-timeline-ruler-row',
              style: {
                display: 'flex',
                alignItems: 'stretch',
                height: `${rulerHeight}px`,
                minHeight: `${rulerHeight}px`,
                position: 'relative',
              } as CSSProperties,
            },
            [
              h('div', {
                'data-mol-id': 'video-timeline-ruler-header',
                style: {
                  width: `${laneHeaderWidth}px`,
                  minWidth: `${laneHeaderWidth}px`,
                  boxSizing: 'border-box',
                } as CSSProperties,
              }),
              h(
                'div',
                {
                  role: 'slider',
                  tabIndex: 0,
                  'aria-label': rulerLabel,
                  'aria-valuemin': 0,
                  'aria-valuemax': safeDuration(),
                  'aria-valuenow': props.currentTime,
                  'aria-valuetext': playheadLabel,
                  'data-mol-id': 'video-timeline-ruler',
                  style: {
                    flex: '1 1 auto',
                    position: 'relative',
                    height: `${rulerHeight}px`,
                    minWidth: `${bodyWidth()}px`,
                    overflow: 'hidden',
                    cursor: props.onSeek ? 'pointer' : 'default',
                    touchAction: 'none',
                  } as CSSProperties,
                  onPointerdown: (event: PointerEvent) => scrub.press(event),
                },
                [
                  ...tickNodes,
                  h('div', {
                    'data-mol-id': 'video-timeline-playhead-ruler',
                    'aria-hidden': 'true',
                    style: { ...playheadShared, left: `${playhead}px` } as CSSProperties,
                  }),
                ],
              ),
            ],
          ),
          // Tracks (scrollable).
          h(
            'div',
            {
              ref: tracksBody,
              'data-mol-id': 'video-timeline-tracks',
              style: {
                position: 'relative',
                overflowX: 'auto',
                overflowY: 'auto',
                width: '100%',
              } as CSSProperties,
            },
            [
              h(
                'div',
                {
                  style: {
                    position: 'relative',
                    minWidth: `${bodyWidth() + laneHeaderWidth}px`,
                  } as CSSProperties,
                },
                [
                  ...trackRows,
                  h('div', {
                    'data-mol-id': 'video-timeline-playhead',
                    'aria-hidden': 'true',
                    style: {
                      ...playheadShared,
                      left: `${playhead + laneHeaderWidth}px`,
                      zIndex: 2,
                    } as CSSProperties,
                  }),
                ],
              ),
            ],
          ),
        ],
      )
    }
  },
})
