/**
 * VideoPlayer component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/** The wrapper's inline style, exactly as React writes it. */
const WRAPPER_STYLE = 'border-radius: 8px; overflow: hidden'

/** The controls row's inline style, exactly as React writes it. */
const CONTROLS_STYLE = 'position: absolute; left: 0px; right: 0px; bottom: 0px'

/**
 * Formats a time value in seconds as `m:ss`, React's `fmtTime`.
 *
 * @param s - The time in seconds.
 * @returns The formatted time.
 */
function fmtTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * HTML5 video player with custom chrome — play/pause, scrub bar,
 * elapsed/total time, mute, fullscreen. Native controls are hidden so
 * the bar styles match the rest of the app (via ClassMap).
 *
 * The host IS the outer `<div>` (`div[mol-video-player]`), matching React's
 * root exactly, so the wrapper's ClassMap classes and inline style are the
 * host's. The `<video>` element (always carrying its captions track — with no
 * `captionsSrc`, an empty one included, it is a captions track with no
 * source) and the controls row render inside it, in React's order.
 */
@Component({
  selector: 'div[mol-video-player]',
  standalone: true,
  imports: [Button],
  inputs: [
    'src',
    'poster',
    'captionsSrc',
    'captionsLang',
    'captionsLabel',
    'autoPlay',
    'defaultMuted',
    'onPlay',
    'onPause',
    'onEnded',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'wrapperStyle()',
  },
  // prettier-ignore
  template: `<video #video [attr.src]="src" [attr.poster]="poster ?? null" [attr.autoplay]="autoPlay ? '' : null" [muted]="muted" style="display: block; width: 100%; height: auto"><track kind="captions" [attr.src]="captionsSrc || null" [attr.srclang]="captionsLang ?? 'en'" [attr.label]="captionsLabelText()" [attr.default]="''" /></video><div [class]="controlsClasses()" [style]="controlsStyle"><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="toggle()" [attr.aria-label]="toggleLabel()">{{ playing ? '⏸' : '▶' }}</button><span [class]="timeClasses()" style="min-width: 64px">{{ timeText() }}</span><input type="range" [attr.min]="0" [attr.max]="duration || 0" [attr.step]="0.1" [attr.value]="current" (input)="onSeek($event)" [attr.aria-label]="seekLabel()" [class]="seekClasses()" /><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="toggleMute()" [attr.aria-label]="muteLabel()">{{ muted ? '🔇' : '🔊' }}</button><button mol-button [variant]="'ghost'" [size]="'sm'" (click)="toggleFullscreen()" [attr.aria-label]="fullscreenLabel()">⛶</button></div>`,
})
export class VideoPlayer implements OnInit, AfterViewInit, DoCheck, OnDestroy {
  /** Video URL. */
  src = ''
  /** Optional poster image URL. */
  poster?: string
  /** Caption track URL (.vtt). */
  captionsSrc?: string
  /** Caption language code (defaults to `'en'` at read time). */
  captionsLang?: string
  /**
   * Human-readable name of the captions track (the track's `label`, which
   * screen readers and the browser's caption menu announce). Defaults
   * through i18n (`video.captions`, English "Captions").
   */
  captionsLabel?: string
  /** Autoplay (must be muted to work in most browsers). */
  autoPlay?: boolean
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Called when the media starts playing. */
  onPlay?: () => void
  /** Called when the media is paused. */
  onPause?: () => void
  /** Called when the media reaches its end. */
  onEnded?: () => void
  /** Extra classes. */
  className?: string

  /** The `<video>` element the listeners attach to. */
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>

  /** Whether the media is playing (React's `playing` state). */
  playing = false
  /** Whether the player is muted (React's `muted` state). */
  muted = false
  /** The media duration in seconds (React's `duration` state). */
  duration = 0
  /** The current position in seconds (React's `current` state). */
  current = 0

  /** React's wrapper inline style. */
  readonly controlsStyle = CONTROLS_STYLE

  private readonly i18n = useTranslation()
  private readonly cd = inject(ChangeDetectorRef)
  private readonly host: HTMLElement = inject(ElementRef).nativeElement
  /** The positioned listener cleanups, for the teardown. */
  private detach: Array<() => void> = []

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (React's `cm.cn(cm.position('relative'), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.cm().bgScrim, this.className)
  }

  /**
   * The wrapper's inline style (React's `style` object on the root `<div>`).
   * @returns The `style` attribute text.
   */
  wrapperStyle(): string {
    return WRAPPER_STYLE
  }

  /**
   * The controls row's classes (React's `cm.cn(cm.flex(...), cm.sp('px', 3), cm.sp('py', 2))`).
   * @returns The class string.
   */
  controlsClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().bgScrim,
      this.cm().textOnTone,
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
    )
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

  /** Reads React's `useState` initializers, once the inputs are bound. */
  ngOnInit(): void {
    this.playing = !!this.autoPlay
    this.muted = !!this.defaultMuted || !!this.autoPlay
  }

  /** Attaches the media listeners (React's effect). */
  ngAfterViewInit(): void {
    const video = this.videoRef?.nativeElement
    if (!video) return
    const onTimeUpdate = (): void => {
      this.current = video.currentTime
      this.cd.markForCheck()
    }
    const onLoadedMetadata = (): void => {
      this.duration = video.duration
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
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('play', onPlayEvent)
    video.addEventListener('pause', onPauseEvent)
    video.addEventListener('ended', onEndedEvent)
    this.detach.push(() => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('play', onPlayEvent)
      video.removeEventListener('pause', onPauseEvent)
      video.removeEventListener('ended', onEndedEvent)
    })
  }

  /** Keeps the range input's live value on React's controlled value (its state). */
  ngDoCheck(): void {
    this.syncRange()
  }

  /** Removes the media listeners (React's effect cleanup). */
  ngOnDestroy(): void {
    for (const undo of this.detach.splice(0)) undo()
  }

  /**
   * The elapsed / total display (React's `{fmtTime(current)} / {fmtTime(duration)}`).
   * @returns The time text.
   */
  timeText(): string {
    return `${fmtTime(this.current)} / ${fmtTime(this.duration)}`
  }

  /**
   * The play/pause control's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  toggleLabel(): string {
    return this.playing
      ? this.i18n.t('video.pause', {}, { defaultValue: 'Pause' })
      : this.i18n.t('video.play', {}, { defaultValue: 'Play' })
  }

  /**
   * The seek control's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  seekLabel(): string {
    return this.i18n.t('video.seek', {}, { defaultValue: 'Seek' })
  }

  /**
   * The mute control's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  muteLabel(): string {
    return this.muted
      ? this.i18n.t('video.unmute', {}, { defaultValue: 'Unmute' })
      : this.i18n.t('video.mute', {}, { defaultValue: 'Mute' })
  }

  /**
   * The fullscreen control's accessible name (React's `aria-label`).
   * @returns The label text.
   */
  fullscreenLabel(): string {
    return this.i18n.t('video.fullscreen', {}, { defaultValue: 'Fullscreen' })
  }

  /**
   * The captions track's accessible name (React's `label`).
   * @returns The label text.
   */
  captionsLabelText(): string {
    return this.captionsLabel ?? this.i18n.t('video.captions', {}, { defaultValue: 'Captions' })
  }

  /** Toggles play/pause on the video element (React's `toggle`). */
  toggle(): void {
    const video = this.videoRef?.nativeElement
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  /**
   * Seeks the video to a position in seconds (React's `seek`). React restores
   * a controlled input to the state value right after the change handler
   * returns, so the range is written back too.
   * @param event - The range input's native input event.
   */
  onSeek(event: Event): void {
    const element = event.target as HTMLInputElement
    const video = this.videoRef?.nativeElement
    if (video) video.currentTime = Number(element.value)
    element.value = String(this.current)
  }

  /** Toggles the muted state on the video element and in the state (React's `toggleMute`). */
  toggleMute(): void {
    const video = this.videoRef?.nativeElement
    if (!video) return
    video.muted = !video.muted
    this.muted = video.muted
    this.cd.markForCheck()
  }

  /** Requests or exits fullscreen for the video element (React's `toggleFullscreen`). */
  toggleFullscreen(): void {
    const video = this.videoRef?.nativeElement
    if (!video) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void video.requestFullscreen?.()
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
}
