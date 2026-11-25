/**
 * VideoTimeline component (React parity): a multi-track video timeline
 * composing one `<TrackLane>` per track row with a shared time ruler,
 * playhead, zoom slider + Ctrl+wheel zoom, and ripple/insert edit modes.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { clipToPixels, pixelsToTime, TrackLane } from '@molecule/app-feature-track-lane-angular'
import {
  type ElementDrag,
  type ElementDragPoint,
  getClassMap,
  type UIClassMap,
} from '@molecule/app-ui'
import { WebDragDirective, WebWheelZoomDirective } from '@molecule/app-ui-angular'

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
import type { Track, TrackKind, VideoTimelineMode } from './types.js'

/**
 * VideoTimeline component.
 *
 * A multi-track video timeline: one `<TrackLane>` per track row with a shared
 * time ruler at the top, a vertical playhead, and a zoom slider row.
 * Pointer-down on the ruler scrubs `onSeek`; Ctrl+wheel anywhere over the body
 * changes zoom; the slider is keyboard-accessible. All styling routes through
 * `getClassMap()` and all user-visible text routes through `useTranslation()`.
 *
 * The host IS React's root `<div>` (`div[mol-video-timeline]`): `role`, the
 * translated `aria-label`, `data-mol-id` and `data-mode` live on it.
 *
 * In `'ripple'` mode (default), dragging a clip on a lane shifts every
 * subsequent clip on that lane by the same delta — `onClipMove` is called once
 * per affected clip. In `'insert'` mode, only the dragged clip moves.
 */
@Component({
  selector: 'div[mol-video-timeline]',
  standalone: true,
  imports: [TrackLane, WebDragDirective, WebWheelZoomDirective],
  inputs: [
    'tracks',
    'currentTime',
    'duration',
    'onSeek',
    'onClipMove',
    'onClipResize',
    'pixelsPerSecond',
    'zoomMin',
    'zoomMax',
    'mode',
    'onZoomChange',
    'selectedClipId',
    'onClipClick',
    'trackHeight',
    'laneHeaderWidth',
    'rulerHeight',
    'className',
  ],
  host: {
    role: 'group',
    'data-mol-id': 'video-timeline',
    '[attr.aria-label]': 'rootLabel()',
    '[attr.data-mode]': 'modeOf()',
    '[class]': 'rootClasses()',
    '[style.width]': `'100%'`,
    '[style.overflow]': `'hidden'`,
  },
  // prettier-ignore
  template: `<div data-mol-id="video-timeline-controls" [class]="controlsClasses()"><span data-mol-id="video-timeline-mode"><span [class]="srOnlyClasses()">{{ modeLabel() }}</span>{{ modeText() }}</span><button type="button" data-mol-id="video-timeline-zoom-out" [attr.aria-label]="zoomOutLabel()" [class]="buttonClasses()" (click)="stepZoom('out', true)"> {{ zoomOutIcon() }} </button><input type="range" data-mol-id="video-timeline-zoom-slider" [attr.aria-label]="zoomLabel()" [attr.min]="zoomMinOf()" [attr.max]="zoomMaxOf()" step="1" [attr.value]="sliderValue()" (input)="handleZoomInput($event)" /><button type="button" data-mol-id="video-timeline-zoom-in" [attr.aria-label]="zoomInLabel()" [class]="buttonClasses()" (click)="stepZoom('in', true)"> {{ zoomInIcon() }} </button></div><div data-mol-id="video-timeline-ruler-row" [style]="rulerRowStyle()"><div data-mol-id="video-timeline-ruler-header" [style]="rulerHeaderStyle()"></div><div role="slider" tabindex="0" [attr.aria-label]="rulerLabel()" aria-valuemin="0" [attr.aria-valuemax]="safeDuration()" [attr.aria-valuenow]="currentTime ?? null" [attr.aria-valuetext]="playheadLabel()" data-mol-id="video-timeline-ruler" [style]="rulerBodyStyle()" [molDrag]="onSeek ? rulerDrag : undefined">@for (tick of ticks(); track tick.time) {<div><div data-mol-id="video-timeline-tick" [attr.data-time]="tick.time" [style]="tickStyle(tick)"></div><span data-mol-id="video-timeline-tick-label" [attr.data-time]="tick.time" [style]="tickLabelStyle(tick)"> {{ tickText(tick) }} </span></div>}<div data-mol-id="video-timeline-playhead-ruler" aria-hidden="true" [style]="playheadInRulerStyle()"></div></div></div><div [molWheelZoom]="onZoomChange ? stepWheelZoom : undefined" data-mol-id="video-timeline-tracks" [style]="tracksScrollStyle()"><div [style]="tracksInnerStyle()">@for (track of tracks ?? []; track track.id) {<div data-mol-id="video-timeline-track" [attr.data-track-id]="track.id" [attr.data-track-kind]="track.kind"><div mol-track-lane [name]="laneName(track)" [clips]="track.clips" [pixelsPerSecond]="safeScale()" [height]="trackHeightOf()" [lane]="track.id" [selectedClipId]="selectedClipId" [onClipMove]="moveFor(track)" [onClipResize]="resizeFor(track)" [onClipClick]="clickFor(track)"></div></div>}<div data-mol-id="video-timeline-playhead" aria-hidden="true" [style]="playheadStyle()"></div></div></div>`,
})
export class VideoTimeline {
  /** Tracks to render, in display order. */
  tracks?: Track[]
  /** Current playhead time in seconds. */
  currentTime?: number
  /** Total timeline duration in seconds. */
  duration?: number
  /** Called when the user clicks/scrubs the ruler. */
  onSeek?: (time: number) => void
  /** Called when a clip on a lane is dragged horizontally. */
  onClipMove?: (clipId: string, startTime: number, trackId: string) => void
  /** Called when a clip's right-edge resize handle is dragged. */
  onClipResize?: (clipId: string, duration: number, trackId: string) => void
  /** Horizontal scale (px per second), defaults to 20 (read at render time). */
  pixelsPerSecond?: number
  /** Lower zoom bound, defaults to 2 (read at render time). */
  zoomMin?: number
  /** Upper zoom bound, defaults to 200 (read at render time). */
  zoomMax?: number
  /** Edit mode for clip drags, defaults to `'ripple'` (read at render time). */
  mode?: VideoTimelineMode
  /** Called when the user changes the zoom (slider or Ctrl+wheel). */
  onZoomChange?: (pixelsPerSecond: number) => void
  /** Optional currently-selected clip id. */
  selectedClipId?: string
  /** Called when a clip is clicked (no drag). */
  onClipClick?: (clipId: string, trackId: string) => void
  /** Per-track row height in pixels, defaults to 44 (read at render time). */
  trackHeight?: number
  /** Width of the leading lane-header column, defaults to 120 (read at render time). */
  laneHeaderWidth?: number
  /** Height of the time ruler row, defaults to 28 (read at render time). */
  rulerHeight?: number
  /** Extra classes merged onto the root element. */
  className?: string

  /** The i18n state; `t` re-reads the provider on every call and on every locale switch. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root element's class list (React's root `cm.cn(className)`).
   *
   * @returns The class string.
   */
  rootClasses(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The controls row's class list.
   *
   * @returns The class string.
   */
  controlsClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().sp('p', 2))
  }

  /**
   * A zoom button's class list.
   *
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(this.cm().cursorPointer)
  }

  /**
   * The mode span's visually hidden label class list.
   *
   * @returns The class string.
   */
  srOnlyClasses(): string {
    return this.cm().cn(this.cm().srOnly)
  }

  /**
   * The duration clamped to >= 0 (React's `safeDuration`).
   * @returns The safe duration.
   */
  safeDuration(): number {
    return (this.duration ?? 0) > 0 ? (this.duration as number) : 0
  }

  /**
   * The horizontal scale in effect (default 20).
   *
   * @returns Pixels per second.
   */
  scaleOf(): number {
    return this.pixelsPerSecond ?? DEFAULT_PIXELS_PER_SECOND
  }

  /**
   * The scale clamped to >= 1 (React's `safeScale`).
   *
   * @returns The safe scale.
   */
  safeScale(): number {
    return this.scaleOf() > 0 ? this.scaleOf() : 1
  }

  /**
   * The lower zoom bound in effect (default 2).
   *
   * @returns The lower bound.
   */
  zoomMinOf(): number {
    return this.zoomMin ?? DEFAULT_ZOOM_MIN
  }

  /**
   * The upper zoom bound in effect (default 200).
   *
   * @returns The upper bound.
   */
  zoomMaxOf(): number {
    return this.zoomMax ?? DEFAULT_ZOOM_MAX
  }

  /**
   * The edit mode in effect (default `'ripple'`).
   *
   * @returns The mode.
   */
  modeOf(): VideoTimelineMode {
    return this.mode ?? 'ripple'
  }

  /**
   * The lane row height in effect (default 44).
   *
   * @returns The height in pixels.
   */
  trackHeightOf(): number {
    return this.trackHeight ?? DEFAULT_TRACK_HEIGHT
  }

  /**
   * The lane-header column width in effect (default 120).
   *
   * @returns The width in pixels.
   */
  laneHeaderWidthOf(): number {
    return this.laneHeaderWidth ?? DEFAULT_LANE_HEADER_WIDTH
  }

  /**
   * The ruler row height in effect (default 28).
   *
   * @returns The height in pixels.
   */
  rulerHeightOf(): number {
    return this.rulerHeight ?? DEFAULT_RULER_HEIGHT
  }

  /**
   * The scrollable body's content width in pixels (React's `bodyWidth`).
   *
   * @returns The width in pixels.
   */
  bodyWidth(): number {
    return Math.max(0, this.safeDuration() * this.safeScale())
  }

  /**
   * The ruler ticks (React's `computeRulerTicks` of the safe duration + scale).
   *
   * @returns The tick descriptors.
   */
  ticks(): { time: number; pixel: number }[] {
    return computeRulerTicks(this.safeDuration(), this.safeScale())
  }

  /**
   * The playhead's pixel offset on the time axis (React's `playheadPx`).
   *
   * @returns The offset in pixels.
   */
  playheadPx(): number {
    return clipToPixels({ startTime: this.currentTime ?? 0, duration: 0 }, this.safeScale()).left
  }

  /**
   * The displayed zoom slider value (React's rounded, clamped scale).
   *
   * @returns The slider value.
   */
  sliderValue(): number {
    return Math.round(clampZoom(this.safeScale(), this.zoomMinOf(), this.zoomMaxOf()))
  }

  /**
   * The translated ruler label (React's `videoTimeline.aria.ruler`).
   *
   * @returns The translated label.
   */
  rulerLabel(): string {
    return this.i18n.t('videoTimeline.aria.ruler', {}, { defaultValue: 'Time ruler' })
  }

  /**
   * The translated playhead label (React's `videoTimeline.aria.playhead`).
   *
   * @returns The translated label.
   */
  playheadLabel(): string {
    return this.i18n.t(
      'videoTimeline.aria.playhead',
      { time: (this.currentTime ?? 0).toFixed(2) },
      { defaultValue: 'Playhead at {{time}}s' },
    )
  }

  /**
   * The translated zoom slider label (React's `videoTimeline.aria.zoom`).
   *
   * @returns The translated label.
   */
  zoomLabel(): string {
    return this.i18n.t('videoTimeline.aria.zoom', {}, { defaultValue: 'Timeline zoom' })
  }

  /**
   * The translated zoom-in label (React's `videoTimeline.zoom.in`).
   *
   * @returns The translated label.
   */
  zoomInLabel(): string {
    return this.i18n.t('videoTimeline.zoom.in', {}, { defaultValue: 'Zoom in' })
  }

  /**
   * The translated zoom-out label (React's `videoTimeline.zoom.out`).
   *
   * @returns The translated label.
   */
  zoomOutLabel(): string {
    return this.i18n.t('videoTimeline.zoom.out', {}, { defaultValue: 'Zoom out' })
  }

  /**
   * The translated mode label (React's `videoTimeline.aria.mode`).
   *
   * @returns The translated label.
   */
  modeLabel(): string {
    return this.i18n.t('videoTimeline.aria.mode', {}, { defaultValue: 'Edit mode' })
  }

  /**
   * The translated root label (React's `videoTimeline.aria.root`).
   *
   * @returns The translated label.
   */
  rootLabel(): string {
    return this.i18n.t('videoTimeline.aria.root', {}, { defaultValue: 'Video timeline' })
  }

  /**
   * The visible mode text (React's ripple/insert branch).
   *
   * @returns The translated mode text.
   */
  modeText(): string {
    return this.modeOf() === 'ripple'
      ? this.i18n.t('videoTimeline.mode.ripple', {}, { defaultValue: 'Ripple' })
      : this.i18n.t('videoTimeline.mode.insert', {}, { defaultValue: 'Insert' })
  }

  /**
   * The translated zoom-out glyph (React's `videoTimeline.zoom.out.icon`).
   *
   * @returns The translated glyph.
   */
  zoomOutIcon(): string {
    return this.i18n.t('videoTimeline.zoom.out.icon', {}, { defaultValue: '−' })
  }

  /**
   * The translated zoom-in glyph (React's `videoTimeline.zoom.in.icon`).
   *
   * @returns The translated glyph.
   */
  zoomInIcon(): string {
    return this.i18n.t('videoTimeline.zoom.in.icon', {}, { defaultValue: '+' })
  }

  /**
   * The translated label of one track kind (React's `trackKindLabel`).
   *
   * @param kind - The track kind.
   * @returns The translated kind label.
   */
  trackKindLabel(kind: TrackKind): string {
    switch (kind) {
      case 'video':
        return this.i18n.t('videoTimeline.trackKind.video', {}, { defaultValue: 'Video' })
      case 'audio':
        return this.i18n.t('videoTimeline.trackKind.audio', {}, { defaultValue: 'Audio' })
      case 'subtitle':
        return this.i18n.t('videoTimeline.trackKind.subtitle', {}, { defaultValue: 'Subtitle' })
    }
  }

  /**
   * The lane name React passes to `<TrackLane>`: the track's name, or the
   * translated kind label.
   *
   * @param track - The track row.
   * @returns The lane name.
   */
  laneName(track: Track): string {
    return track.name ?? this.trackKindLabel(track.kind)
  }

  /**
   * The `onClipMove` handler of one track's lane: forwards through the
   * ripple fan-out with the track id.
   *
   * @param track - The track row.
   * @returns The lane handler.
   */
  moveFor(track: Track): (clipId: string, startTime: number) => void {
    return (clipId: string, startTime: number) => this.handleClipMove(track.id, clipId, startTime)
  }

  /**
   * The `onClipResize` handler of one track's lane: forwards with the track id.
   *
   * @param track - The track row.
   * @returns The lane handler.
   */
  resizeFor(track: Track): (clipId: string, duration: number) => void {
    return (clipId: string, clipDuration: number) =>
      this.onClipResize?.(clipId, clipDuration, track.id)
  }

  /**
   * The `onClipClick` handler of one track's lane: forwards with the track id.
   *
   * @param track - The track row.
   * @returns The lane handler.
   */
  clickFor(track: Track): (clipId: string) => void {
    return (clipId: string) => this.onClipClick?.(clipId, track.id)
  }

  /**
   * Converts the pointer's horizontal offset from the ruler's left edge to a
   * time value, clamped into `[0, duration]` (React's `seekAt`).
   *
   * @param point - A drag sample relative to the ruler.
   */
  private readonly seekAt = ({ x }: ElementDragPoint): void => {
    this.onSeek?.(Math.min(pixelsToTime(x, this.safeScale()), this.safeDuration()))
  }

  /** Seeks during a horizontal drag on the ruler. */
  readonly rulerDrag: ElementDrag = {
    axis: 'horizontal',
    onStart: this.seekAt,
    onMove: this.seekAt,
  }

  /**
   * Applies one zoom step of the wheel factor (React's `stepZoom`). The zoom
   * buttons use it too; they also report when the scale is already at the bound.
   *
   * @param direction - Which way to step.
   * @param notifyAtLimit - Whether to report a step that stays at the bound.
   */
  stepZoom(direction: 'in' | 'out', notifyAtLimit = false): void {
    const next = zoomFromWheelDelta(
      this.safeScale(),
      direction === 'in' ? -1 : 1,
      this.zoomMinOf(),
      this.zoomMaxOf(),
    )
    if (notifyAtLimit || next !== this.safeScale()) this.onZoomChange?.(next)
  }

  /** Applies a zoom step from the tracks surface. */
  readonly stepWheelZoom = (direction: 'in' | 'out'): void => this.stepZoom(direction)

  /**
   * Forward a track-lane clip move to `onClipMove`, fanning out via
   * `computeRippleUpdates` when in `'ripple'` mode.
   *
   * @param trackId - The track id forwarded as the lane id.
   * @param clipId - The id of the dragged clip.
   * @param proposedStartTime - The candidate new `startTime`.
   */
  handleClipMove(trackId: string, clipId: string, proposedStartTime: number): void {
    if (!this.onClipMove) return
    const track = (this.tracks ?? []).find((tr) => tr.id === trackId)
    if (!track) {
      this.onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    if (this.modeOf() === 'insert') {
      this.onClipMove(clipId, proposedStartTime, trackId)
      return
    }
    const updates = computeRippleUpdates(track.clips, clipId, proposedStartTime)
    for (const u of updates) this.onClipMove(u.id, u.startTime, trackId)
  }

  /**
   * The zoom slider's `input` handler: emits the clamped value, then
   * applies React's controlled-input restore (the DOM value returns to
   * the prop).
   *
   * @param event - The native input event.
   */
  handleZoomInput(event: Event): void {
    const element = event.target as HTMLInputElement
    this.onZoomChange?.(clampZoom(Number(element.value), this.zoomMinOf(), this.zoomMaxOf()))
    element.value = String(this.sliderValue())
  }

  /**
   * The ruler row's inline geometry (React's `rulerRowStyle`).
   *
   * @returns The style declarations.
   */
  rulerRowStyle(): string {
    const height = this.rulerHeightOf()
    return [
      'display: flex',
      'align-items: stretch',
      `height: ${height}px`,
      `min-height: ${height}px`,
      'position: relative',
    ].join('; ')
  }

  /**
   * The ruler header's inline geometry (React's `rulerHeaderStyle`).
   *
   * @returns The style declarations.
   */
  rulerHeaderStyle(): string {
    const width = this.laneHeaderWidthOf()
    return ['box-sizing: border-box', `min-width: ${width}px`, `width: ${width}px`].join('; ')
  }

  /**
   * The ruler body's inline geometry (React's `rulerBodyStyle`).
   *
   * @returns The style declarations.
   */
  rulerBodyStyle(): string {
    return [
      'cursor: ' + (this.onSeek ? 'pointer' : 'default'),
      'flex: 1 1 auto',
      `height: ${this.rulerHeightOf()}px`,
      `min-width: ${this.bodyWidth()}px`,
      'overflow: hidden',
      'position: relative',
      'touch-action: none',
    ].join('; ')
  }

  /**
   * One tick's inline geometry (React's `tickStyle`).
   *
   * @param tick - The tick descriptor.
   * @returns The style declarations.
   */
  tickStyle(tick: { time: number; pixel: number }): string {
    return [
      'background: var(--mol-video-timeline-tick, rgba(127, 127, 127, 0.5))',
      'bottom: 0px',
      `left: ${tick.pixel}px`,
      'pointer-events: none',
      'position: absolute',
      'top: 0px',
      'width: 1px',
    ].join('; ')
  }

  /**
   * One tick label's inline geometry (React's `labelStyle`).
   *
   * @param tick - The tick descriptor.
   * @returns The style declarations.
   */
  tickLabelStyle(tick: { time: number; pixel: number }): string {
    return [
      `left: ${tick.pixel + 2}px`,
      'font-size: 10px',
      'pointer-events: none',
      'position: absolute',
      'top: 2px',
    ].join('; ')
  }

  /**
   * One tick label's text (React's `formatTickTime`).
   *
   * @param tick - The tick descriptor.
   * @returns The formatted tick time.
   */
  tickText(tick: { time: number; pixel: number }): string {
    return formatTickTime(tick.time)
  }

  /**
   * The in-ruler playhead's inline geometry (React's `playheadInRulerStyle`).
   *
   * @returns The style declarations.
   */
  playheadInRulerStyle(): string {
    return ['left: ' + this.playheadPx() + 'px', this.playheadSharedStyle()].join('; ')
  }

  /**
   * The tracks-area playhead's inline geometry (React's `playheadStyle`).
   *
   * @returns The style declarations.
   */
  playheadStyle(): string {
    return [
      'left: ' + (this.playheadPx() + this.laneHeaderWidthOf()) + 'px',
      'z-index: 2',
      this.playheadSharedStyle(),
    ].join('; ')
  }

  /**
   * The playhead's shared inline geometry (position + fill).
   *
   * @returns The style declarations.
   */
  private playheadSharedStyle(): string {
    return [
      'background: var(--mol-video-timeline-playhead, #ff3b30)',
      'bottom: 0px',
      'pointer-events: none',
      'position: absolute',
      'top: 0px',
      'width: 2px',
    ].join('; ')
  }

  /**
   * The tracks area's inline geometry (React's `tracksScrollStyle`).
   *
   * @returns The style declarations.
   */
  tracksScrollStyle(): string {
    return ['overflow-x: auto', 'overflow-y: auto', 'position: relative', 'width: 100%'].join('; ')
  }

  /**
   * The tracks' inner div's inline geometry (React's `tracksInnerStyle`).
   *
   * @returns The style declarations.
   */
  tracksInnerStyle(): string {
    return [
      'position: relative',
      `min-width: ${this.bodyWidth() + this.laneHeaderWidthOf()}px`,
    ].join('; ')
  }
}
