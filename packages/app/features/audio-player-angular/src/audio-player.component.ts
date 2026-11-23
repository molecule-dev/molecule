/**
 * AudioPlayer component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  type SimpleChanges,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { placeContent, setElementPresent, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/**
 * Whether a field is one of the cases' projected node templates (a `{ $nodes }`
 * value inside a prop becomes a `TemplateRef`).
 *
 * @param value - The field value.
 * @returns True for a projected node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * Whether a capture element holds projected content, ignoring the text the
 * component itself renders there (a string input's interpolation).
 *
 * @param el - The capture element.
 * @param ownText - The text this component interpolates into it.
 * @returns True when projected nodes exist.
 */
function hasProjectedNodes(el: HTMLElement | undefined, ownText: string): boolean {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) return true
    if (node.nodeType !== Node.TEXT_NODE) continue
    const value = node.textContent ?? ''
    if (value.trim() && value !== ownText) return true
  }
  return false
}

/**
 * Formats a duration in seconds as M:SS (90 → `1:30`), React's `fmt`.
 *
 * @param s - The duration in seconds.
 * @returns The formatted time.
 */
function fmt(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * HTML5 audio player chrome — play/pause, scrub, time, mute, optional
 * visualizer slot.
 *
 * The host IS the outer `<div>` (`div[mol-audio-player]`), matching React's
 * root exactly, so the wrapper's ClassMap classes are the host's. The
 * `<audio>` element, the optional title / subtitle header, the visualizer and
 * the controls row render inside it, in React's order.
 *
 * Angular projection needs always-mounted `<ng-content>` capture points, so
 * the header (and each of its spans) and the visualizer wrapper live in the
 * template unconditionally and {@link AudioPlayer.ngDoCheck} reconciles them
 * against React's DOM — React omits the header when neither title nor subtitle
 * renders, and renders the visualizer bare, without a wrapper element.
 */
@Component({
  selector: 'div[mol-audio-player]',
  standalone: true,
  imports: [Button, NgTemplateOutlet],
  inputs: [
    'src',
    'title',
    'subtitle',
    'visualizer',
    'captions',
    'captionsLang',
    'captionsLabel',
    'defaultMuted',
    'autoPlay',
    'onPlay',
    'onPause',
    'onEnded',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<audio #audio [attr.src]="src" [attr.autoplay]="autoPlay ? '' : null" [muted]="muted" preload="metadata" style="display: none"><track #track kind="captions" [attr.src]="captions" [attr.srclang]="captionsLang" [attr.label]="trackLabel()" /></audio><header #header [class]="stackClasses()"><span #titleSpan [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content>@if (isTemplate(title)) {<ng-container [ngTemplateOutlet]="asTemplate(title)" />}@if (titleText()) {{{ titleText() }}}</span><span #subtitleSpan [class]="subtitleClasses()"><ng-content select="[slot=subtitle]"></ng-content>@if (isTemplate(subtitle)) {<ng-container [ngTemplateOutlet]="asTemplate(subtitle)" />}@if (subtitleText()) {{{ subtitleText() }}}</span></header><span #visualizerSlot><ng-content select="[slot=visualizer]"></ng-content></span>@if (isTemplate(visualizer)) {<ng-container [ngTemplateOutlet]="asTemplate(visualizer)" />}@if (visualizerText()) {{{ visualizerText() }}}<div [class]="controlsClasses()"><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="toggle()" data-mol-id="audio-player-toggle" [attr.aria-label]="toggleLabel()"><span aria-hidden="true">{{ playing ? '⏸' : '▶' }}</span></button><span [class]="timeClasses()" style="min-width: 64px">{{ timeText() }}</span><input type="range" [attr.min]="0" [attr.max]="duration || 0" [attr.step]="0.1" [attr.value]="current" (input)="onSeek($event)" [attr.aria-label]="seekLabel()" data-mol-id="audio-player-seek" [class]="seekClasses()" /><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="toggleMute()" data-mol-id="audio-player-mute" [attr.aria-label]="muteLabel()"><span aria-hidden="true">{{ muted ? '🔇' : '🔊' }}</span></button></div>@if (captions) {<p aria-live="polite" data-mol-id="audio-player-captions" [class]="captionClasses()" style="min-height: 1.5em; white-space: pre-line">{{ caption }}</p>}`,
})
export class AudioPlayer implements OnInit, AfterViewInit, DoCheck, OnChanges, OnDestroy {
  /** Audio source URL (a file, a stream or a data URI). */
  src = ''
  /** Optional title / track name: a string input, or projected `[slot=title]` content. */
  title?: unknown
  /** Optional artist / source label: a string input, or projected `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Optional waveform / visualizer: projected `[slot=visualizer]` content. */
  visualizer?: unknown
  /**
   * WebVTT captions file URL. When set, the player loads it on the media
   * element's captions `<track>` and shows the current caption under the
   * controls, in a polite live region that screen readers announce. Without
   * it the track is empty and no caption line is shown.
   */
  captions?: string
  /** BCP 47 language of the captions (the track's `srclang`). */
  captionsLang?: string
  /**
   * Human-readable name of the captions track. Defaults through i18n
   * (`audio.captions`, English "Captions").
   */
  captionsLabel?: string
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Autoplay (browser may block). */
  autoPlay?: boolean
  /** Called when the media starts playing. */
  onPlay?: () => void
  /** Called when the media is paused. */
  onPause?: () => void
  /** Called when the media reaches its end. */
  onEnded?: () => void
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The hidden media element. */
  @ViewChild('audio') audioRef?: ElementRef<HTMLAudioElement>
  /** The captions track element (its text track fires `cuechange`). */
  @ViewChild('track') trackRef?: ElementRef<HTMLTrackElement>
  /** The title / subtitle header (present only while React renders it). */
  @ViewChild('header') headerRef?: ElementRef<HTMLElement>
  /** The title span (present only while React renders it). */
  @ViewChild('titleSpan') titleSpanRef?: ElementRef<HTMLElement>
  /** The subtitle span (present only while React renders it). */
  @ViewChild('subtitleSpan') subtitleSpanRef?: ElementRef<HTMLElement>
  /** The visualizer's capture wrapper (unwrapped when React renders content). */
  @ViewChild('visualizerSlot') visualizerSlotRef?: ElementRef<HTMLElement>

  /** Whether the media is playing (React's `playing` state). */
  playing = false
  /** Whether the player is muted (React's `muted` state). */
  muted = false
  /** The media duration in seconds (React's `duration` state). */
  duration = 0
  /** The current position in seconds (React's `current` state). */
  current = 0
  /** The active cues' text (React's `caption` state). */
  caption = ''

  private readonly i18n = useTranslation()
  private readonly cd = inject(ChangeDetectorRef)
  private readonly host: HTMLElement = inject(ElementRef).nativeElement

  /** Whether `[slot=title]` content was projected. */
  private hasTitleSlot = false
  /** Whether `[slot=subtitle]` content was projected. */
  private hasSubtitleSlot = false
  /** Whether `[slot=visualizer]` content was projected. */
  private hasVisualizerSlot = false
  /** The positioned listener cleanups, for the teardown. */
  private detach: Array<() => void> = []
  /** Whether the view (and with it the `<track>` element) exists. */
  private viewReady = false
  /** Removes the captions `cuechange` listener, while it is attached. */
  private detachCaptions: (() => void) | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (React's `cm.cn(cm.stack(2), cm.sp('p', 3), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.cm().sp('p', 3), this.className)
  }

  /**
   * The title span's classes (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The subtitle span's classes (React's `cm.textSize('xs')`).
   * @returns The class string.
   */
  subtitleClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The caption line's classes (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  captionClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The header's classes (React's `cm.stack(0)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().stack(0))
  }

  /**
   * The elapsed / total span's classes (React's `cm.textSize('xs')`).
   * @returns The class string.
   */
  timeClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The range input's classes (React's `cm.flex1`).
   * @returns The class string.
   */
  seekClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * The controls row's classes (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  controlsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /** Reads React's `useState` initializers, once the inputs are bound. */
  ngOnInit(): void {
    this.playing = !!this.autoPlay
    this.muted = !!this.defaultMuted
  }

  /**
   * Tears the captions setup down and rebuilds it after a `captions` input
   * change (React's effect over the `captions` dependency) — nothing to do
   * before the view exists ({@link AudioPlayer.ngAfterViewInit} runs it then).
   * @param changes - The inputs that changed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady || !('captions' in changes)) return
    this.dropCaptions()
    this.syncCaptions()
  }

  /**
   * Attaches the media listeners (React's effect) and reads the projected
   * slots' presence — view queries resolve only at view init.
   */
  ngAfterViewInit(): void {
    const audio = this.audioRef?.nativeElement
    if (audio) {
      const onTimeUpdate = (): void => {
        this.current = audio.currentTime
        this.cd.markForCheck()
      }
      const onLoadedMetadata = (): void => {
        this.duration = audio.duration
        this.cd.markForCheck()
      }
      const onPlayEvent = (): void => {
        this.playing = true
        this.onPlay?.()
        this.cd.markForCheck()
      }
      const onPauseEvent = (): void => {
        this.playing = false
        this.onPause?.()
        this.cd.markForCheck()
      }
      const onEndedEvent = (): void => {
        this.playing = false
        this.onEnded?.()
        this.cd.markForCheck()
      }
      audio.addEventListener('timeupdate', onTimeUpdate)
      audio.addEventListener('loadedmetadata', onLoadedMetadata)
      audio.addEventListener('play', onPlayEvent)
      audio.addEventListener('pause', onPauseEvent)
      audio.addEventListener('ended', onEndedEvent)
      this.detach.push(() => {
        audio.removeEventListener('timeupdate', onTimeUpdate)
        audio.removeEventListener('loadedmetadata', onLoadedMetadata)
        audio.removeEventListener('play', onPlayEvent)
        audio.removeEventListener('pause', onPauseEvent)
        audio.removeEventListener('ended', onEndedEvent)
      })
    }
    this.hasTitleSlot = hasProjectedNodes(this.titleSpanRef?.nativeElement, this.titleText())
    this.hasSubtitleSlot = hasProjectedNodes(
      this.subtitleSpanRef?.nativeElement,
      this.subtitleText(),
    )
    this.hasVisualizerSlot = hasProjectedNodes(
      this.visualizerSlotRef?.nativeElement,
      this.visualizerText(),
    )
    this.viewReady = true
    this.syncCaptions()
    this.reconcile()
  }

  /** Re-reconciles React's conditional DOM after input writes and state changes. */
  ngDoCheck(): void {
    this.reconcile()
  }

  /** Removes the media listeners and the captions listener (React's effect cleanup). */
  ngOnDestroy(): void {
    for (const undo of this.detach.splice(0)) undo()
    this.dropCaptions()
  }

  /**
   * Whether React's `{node && …}` branch renders for a node-valued prop: a
   * projected template always does, a plain value only when truthy.
   * @param value - The node-valued prop.
   * @returns True when React renders it.
   */
  shows(value: unknown): boolean {
    if (isTemplate(value)) return true
    return value !== undefined && value !== null && value !== false && value !== '' && value !== 0
  }

  /**
   * Whether a value is a projected node template.
   * @param value - The field value.
   * @returns True for a projected node template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * The value as a template (call under {@link AudioPlayer.isTemplate}).
   * @param value - The field value.
   * @returns The template.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * The title input's text (a string input renders as text; projected nodes
   * render through the capture point instead).
   * @returns The title text, or `''` when absent.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? String(this.title)
      : ''
  }

  /**
   * The subtitle input's text.
   * @returns The subtitle text, or `''` when absent.
   */
  subtitleText(): string {
    return typeof this.subtitle === 'string' || typeof this.subtitle === 'number'
      ? String(this.subtitle)
      : ''
  }

  /**
   * The visualizer input's text.
   * @returns The visualizer text, or `''` when absent.
   */
  visualizerText(): string {
    return typeof this.visualizer === 'string' || typeof this.visualizer === 'number'
      ? String(this.visualizer)
      : ''
  }

  /**
   * The elapsed / total display (React's `{fmt(current)} / {fmt(duration)}`).
   * @returns The time text.
   */
  timeText(): string {
    return `${fmt(this.current)} / ${fmt(this.duration)}`
  }

  /**
   * The play/pause control's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  toggleLabel(): string {
    return this.playing
      ? this.i18n.t('audio.pause', {}, { defaultValue: 'Pause' })
      : this.i18n.t('audio.play', {}, { defaultValue: 'Play' })
  }

  /**
   * The mute control's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  muteLabel(): string {
    return this.muted
      ? this.i18n.t('audio.unmute', {}, { defaultValue: 'Unmute' })
      : this.i18n.t('audio.mute', {}, { defaultValue: 'Mute' })
  }

  /**
   * The seek control's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  seekLabel(): string {
    return this.i18n.t('audio.seek', {}, { defaultValue: 'Seek' })
  }

  /**
   * The captions track's accessible name (React's `label`): the
   * `captionsLabel` input, or the i18n default.
   * @returns The label text.
   */
  trackLabel(): string {
    return this.captionsLabel ?? this.i18n.t('audio.captions', {}, { defaultValue: 'Captions' })
  }

  /** Toggles play/pause on the audio element (React's `toggle`). */
  toggle(): void {
    const audio = this.audioRef?.nativeElement
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  /**
   * Seeks the audio element to a position in seconds (React's `seek`). React
   * restores a controlled input to the state value right after the change
   * handler returns, so the range is written back too.
   * @param event - The range input's native input event.
   */
  onSeek(event: Event): void {
    const element = event.target as HTMLInputElement
    const audio = this.audioRef?.nativeElement
    if (audio) audio.currentTime = Number(element.value)
    element.value = String(this.current)
  }

  /** Toggles the muted state on the media element and in the state (React's `toggleMute`). */
  toggleMute(): void {
    const audio = this.audioRef?.nativeElement
    if (!audio) return
    audio.muted = !audio.muted
    this.muted = audio.muted
    this.cd.markForCheck()
  }

  /**
   * Removes the captions `cuechange` listener and clears the caption (React's
   * effect cleanup; the `<track>` element the listener rode on stays).
   */
  private dropCaptions(): void {
    this.detachCaptions?.()
    this.detachCaptions = null
    if (this.caption) {
      this.caption = ''
      this.cd.markForCheck()
    }
  }

  /**
   * Puts the captions track in `hidden` mode — a hidden track still fires
   * `cuechange`, while the hidden `<audio>` paints nothing — and listens for
   * `cuechange` to show the active cues' text (React's captions effect).
   */
  private syncCaptions(): void {
    const textTrack = this.trackRef?.nativeElement?.track ?? null
    if (!this.captions || !textTrack) return
    if (this.detachCaptions) return
    textTrack.mode = 'hidden'
    const onCue = (): void => {
      const cues = textTrack.activeCues ? Array.from(textTrack.activeCues) : []
      this.caption = cues.map((cue) => ('text' in cue ? String(cue.text) : '')).join('\n')
      this.cd.markForCheck()
    }
    textTrack.addEventListener('cuechange', onCue)
    this.detachCaptions = () => {
      textTrack.removeEventListener('cuechange', onCue)
    }
  }

  /**
   * Applies React's conditional DOM: the header and each span render only when
   * React would render them, and the visualizer's projected nodes sit bare in
   * the wrapper's place.
   */
  private reconcile(): void {
    this.syncRange()
    const showTitle = this.hasTitleSlot || this.shows(this.title)
    const showSubtitle = this.hasSubtitleSlot || this.shows(this.subtitle)
    const header = this.headerRef?.nativeElement
    if (header) {
      if (showTitle || showSubtitle) {
        setElementPresent(header, true)
        setElementPresent(this.titleSpanRef?.nativeElement, showTitle)
        setElementPresent(this.subtitleSpanRef?.nativeElement, showSubtitle)
      } else {
        setElementPresent(header, false)
      }
    }
    this.reconcileVisualizer()
  }

  /**
   * Keeps the range input's live value on React's controlled value (its
   * state): an attribute binding alone does not re-write the property after a
   * user edit, and React re-writes the property on every render.
   */
  private syncRange(): void {
    const input = this.host.querySelector<HTMLInputElement>('input[type="range"]')
    if (input && input.value !== String(this.current)) input.value = String(this.current)
  }

  /** Applies React's visualizer DOM: the content bare without its wrapper, or nothing. */
  private reconcileVisualizer(): void {
    const wrapper = this.visualizerSlotRef?.nativeElement
    if (!wrapper) return
    if (!this.hasVisualizerSlot) {
      // React renders nothing: the content stays hidden inside the capture point.
      placeContent(wrapper, null)
      setElementPresent(wrapper, false)
      return
    }
    // React renders the projected content bare, with no wrapper element.
    const parent = wrapper.parentNode
    if (!parent) return
    placeContent(wrapper, parent, wrapper)
    setElementPresent(wrapper, false)
  }
}
