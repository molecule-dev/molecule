/**
 * NowPlayingBar component (React parity).
 *
 * @module
 */

import { type AfterViewChecked, Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { NowPlayingTrack } from './types.js'

/**
 * Format a number of seconds as `m:ss` (or `0:00` for non-finite input).
 *
 * @param seconds - Seconds to format.
 * @returns The formatted `m:ss` string.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * NowPlayingBar component.
 *
 * Persistent now-playing bar: track artwork, title/artist, transport controls
 * (prev/play-pause/next), scrubber and volume slider. The host IS the root
 * `<div>` (`div[mol-now-playing-bar]`), matching React's root exactly: `role`,
 * `aria-label`, `data-mol-id` and (in the empty state) `data-mol-empty` live on
 * it.
 *
 * Sticky positioning is intentionally NOT enforced inside the component — the
 * caller decides where it lives. All styling routes through `getClassMap()`;
 * all user-visible text routes through `t()` so a locale switch re-renders it.
 * The `trailing` node prop is projected content (`[slot=trailing]`) and its
 * wrapper renders only while it carries nodes, matching React's
 * `{trailing && <div>…</div>}`.
 */
@Component({
  selector: 'div[mol-now-playing-bar]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'track',
    'isPlaying',
    'onPlay',
    'onPause',
    'onNext',
    'onPrev',
    'currentTime',
    'duration',
    'onSeek',
    'volume',
    'onVolumeChange',
    'className',
  ],
  host: {
    role: 'region',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-mol-id]': "'now-playing-bar'",
    '[attr.data-mol-empty]': 'isEmpty() ? "true" : null',
    '[class]': 'rootClasses()',
  },
  template: `@if (isEmpty()) {
      <span [class]="emptySpanClasses()" data-mol-id="now-playing-bar-empty">{{
        emptyLabel()
      }}</span>
    } @else {
      <div
        [class]="shrink0Classes()"
        data-mol-id="now-playing-bar-artwork"
        style="width: 56px; height: 56px"
      >
        @if (track?.artwork; as artwork) {
          <img
            [attr.src]="artwork"
            [attr.alt]="artworkAlt()"
            style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px"
          />
        } @else {
          <div
            aria-hidden="true"
            [class]="artworkPlaceholderClasses()"
            style="width: 100%; height: 100%; border-radius: 6px"
          ></div>
        }
      </div>

      <div
        [class]="metaClasses()"
        data-mol-id="now-playing-bar-meta"
        style="min-width: 0px; flex: 1 1 0%"
      >
        <span
          [class]="titleClasses()"
          data-mol-id="now-playing-bar-title"
          style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block"
          >{{ track?.title }}</span
        >
        <span
          [class]="mediumTextClasses()"
          data-mol-id="now-playing-bar-artist"
          style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block"
          >{{ track?.artist }}</span
        >
      </div>

      <div [class]="transportClasses()" data-mol-id="now-playing-bar-transport">
        @if (onPrev) {
          <button
            type="button"
            (click)="runPrev($event)"
            [attr.aria-label]="prevLabel()"
            data-mol-id="now-playing-bar-prev"
            [class]="cursorClasses()"
          >
            ⏮
          </button>
        }
        <button
          type="button"
          (click)="toggle()"
          [attr.aria-label]="playLabel()"
          [attr.aria-pressed]="isPlaying ? 'true' : 'false'"
          data-mol-id="now-playing-bar-play"
          [class]="cursorClasses()"
        >
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        @if (onNext) {
          <button
            type="button"
            (click)="runNext($event)"
            [attr.aria-label]="nextLabel()"
            data-mol-id="now-playing-bar-next"
            [class]="cursorClasses()"
          >
            ⏭
          </button>
        }
      </div>

      <div
        [class]="rowClasses()"
        data-mol-id="now-playing-bar-scrubber"
        style="flex: 2 1 0%; min-width: 0px"
      >
        <span [class]="mediumTextClasses()" data-mol-id="now-playing-bar-current-time">{{
          formatTime(currentTime)
        }}</span>
        <input
          #seekInput
          type="range"
          [attr.min]="0"
          [attr.max]="seekMax()"
          [attr.step]="0.1"
          [attr.value]="seekValue()"
          (input)="onSeekInput($event)"
          [attr.aria-label]="seekLabel()"
          data-mol-id="now-playing-bar-seek"
          style="flex: 1 1 0%; min-width: 0px"
        />
        <span [class]="mediumTextClasses()" data-mol-id="now-playing-bar-duration">{{
          formatTime(duration)
        }}</span>
      </div>

      @if (onVolumeChange && typeof volume === 'number') {
        <div [class]="volumeClasses()" data-mol-id="now-playing-bar-volume" style="width: 120px">
          <span aria-hidden="true">{{ volume === 0 ? '🔇' : '🔊' }}</span>
          <input
            #volumeInput
            type="range"
            [attr.min]="0"
            [attr.max]="1"
            [attr.step]="0.01"
            [attr.value]="volume"
            (input)="onVolumeInput($event)"
            [attr.aria-label]="volumeLabel()"
            data-mol-id="now-playing-bar-volume-slider"
            style="flex: 1 1 0%; min-width: 0px"
          />
        </div>
      }

      <div #trailingWrapper [class]="shrink0Classes()" data-mol-id="now-playing-bar-trailing">
        <ng-content select="[slot=trailing]"></ng-content>
      </div>
    }`,
})
export class NowPlayingBar implements AfterViewChecked {
  /** The currently loaded track, or null/undefined when nothing is playing. */
  track?: NowPlayingTrack | null
  /** True when the track is actively playing. */
  isPlaying = false
  /** Called when the user presses play. */
  onPlay?: () => void
  /** Called when the user presses pause. */
  onPause?: () => void
  /** Optional next-track handler (receives the click event). */
  onNext?: (event?: MouseEvent) => void
  /** Optional previous-track handler (receives the click event). */
  onPrev?: (event?: MouseEvent) => void
  /** Current playback position in seconds. */
  currentTime = 0
  /** Total track duration in seconds. */
  duration = 0
  /** Called when the user scrubs to a new position (in seconds). */
  onSeek?: (seconds: number) => void
  /** Volume level in `[0, 1]`. */
  volume?: number
  /** Called when the volume slider changes (in `[0, 1]`). */
  onVolumeChange?: (volume: number) => void
  /** Extra classes merged onto the root element. */
  className?: string

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()
  /** The trailing projection wrapper, detached when React renders none. */
  @ViewChild('trailingWrapper') trailingWrapperRef?: ElementRef<HTMLElement>
  /** The controlled range inputs, whose live values React keeps in sync. */
  @ViewChild('seekInput') seekInputRef?: ElementRef<HTMLInputElement>
  @ViewChild('volumeInput') volumeInputRef?: ElementRef<HTMLInputElement>

  /**
   * Renders the trailing wrapper only while its slot has content (React's
   * `{trailing && <div>…}`), including content a consumer projects later.
   */
  constructor() {
    usePlacement((hasContent) => {
      const wrapper = this.trailingWrapperRef?.nativeElement
      setElementPresent(wrapper, wrapper ? hasContent(wrapper) : false)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * React's `track == null` guard.
   * @returns True when nothing is playing.
   */
  isEmpty(): boolean {
    return this.track == null
  }

  /**
   * The root class list shared by both states.
   * @returns The class string.
   */
  rootClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'md' }),
      this.cm().sp('p', 3),
      this.className,
    )
  }

  /**
   * The host's accessible name: the empty label, or the region label naming
   * the track.
   * @returns The label text.
   */
  ariaLabel(): string {
    return this.isEmpty() ? this.emptyLabel() : this.regionLabel()
  }

  /**
   * The empty state's text (`nowPlaying.empty`).
   * @returns The label text.
   */
  emptyLabel(): string {
    return this.i18n.t('nowPlaying.empty', {}, { defaultValue: 'Nothing playing' })
  }

  /**
   * The region's accessible name (`nowPlaying.aria.region`).
   * @returns The label text.
   */
  regionLabel(): string {
    return this.i18n.t(
      'nowPlaying.aria.region',
      { title: this.track?.title ?? '' },
      { defaultValue: 'Now playing: {{title}}' },
    )
  }

  /**
   * The artwork's alt text (`nowPlaying.aria.artwork`).
   * @returns The alt text.
   */
  artworkAlt(): string {
    return this.i18n.t(
      'nowPlaying.aria.artwork',
      { title: this.track?.title ?? '' },
      { defaultValue: 'Artwork for {{title}}' },
    )
  }

  /**
   * The play/pause button's accessible name.
   * @returns The label text.
   */
  playLabel(): string {
    return this.isPlaying
      ? this.i18n.t('nowPlaying.aria.pause', {}, { defaultValue: 'Pause' })
      : this.i18n.t('nowPlaying.aria.play', {}, { defaultValue: 'Play' })
  }

  /**
   * The previous button's accessible name.
   * @returns The label text.
   */
  prevLabel(): string {
    return this.i18n.t('nowPlaying.aria.prev', {}, { defaultValue: 'Previous track' })
  }

  /**
   * The next button's accessible name.
   * @returns The label text.
   */
  nextLabel(): string {
    return this.i18n.t('nowPlaying.aria.next', {}, { defaultValue: 'Next track' })
  }

  /**
   * The scrubber's accessible name.
   * @returns The label text.
   */
  seekLabel(): string {
    return this.i18n.t('nowPlaying.aria.seek', {}, { defaultValue: 'Seek' })
  }

  /**
   * The volume slider's accessible name.
   * @returns The label text.
   */
  volumeLabel(): string {
    return this.i18n.t('nowPlaying.aria.volume', {}, { defaultValue: 'Volume' })
  }

  /**
   * The scrubber's upper bound (`duration > 0 ? duration : 0`).
   * @returns The max value.
   */
  seekMax(): number {
    return this.duration > 0 ? this.duration : 0
  }

  /**
   * The playback position the controlled scrubber shows.
   * @returns The value.
   */
  seekValue(): number {
    return Math.min(this.currentTime, this.seekMax())
  }

  /**
   * A no-shrink wrapper's class list (React's `cm.cn(cm.shrink0)`).
   * @returns The class string.
   */
  shrink0Classes(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * A clickable control's class list (React's `cm.cn(cm.cursorPointer)`).
   * @returns The class string.
   */
  cursorClasses(): string {
    return this.cm().cn(this.cm().cursorPointer)
  }

  /**
   * The empty state's span class list.
   * @returns The class string.
   */
  emptySpanClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().textMuted)
  }

  /**
   * The artwork placeholder's class list.
   * @returns The class string.
   */
  artworkPlaceholderClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', justify: 'center' }))
  }

  /**
   * The title / artist column's class list.
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().cn(this.cm().stack(0))
  }

  /**
   * The title span's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The small-label class list (artist, times).
   * @returns The class string.
   */
  mediumTextClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The transport row's class list.
   * @returns The class string.
   */
  transportClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().shrink0)
  }

  /**
   * The scrubber row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }))
  }

  /**
   * The volume row's class list.
   * @returns The class string.
   */
  volumeClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().shrink0)
  }

  /** React's play/pause toggle. */
  toggle(): void {
    if (this.isPlaying) this.onPause?.()
    else this.onPlay?.()
  }

  /**
   * Calls the previous-track handler with the click event.
   * @param event - The native click event.
   */
  runPrev(event: MouseEvent): void {
    this.onPrev?.(event)
  }

  /**
   * Calls the next-track handler with the click event.
   * @param event - The native click event.
   */
  runNext(event: MouseEvent): void {
    this.onNext?.(event)
  }

  /**
   * Seeks and writes the controlled value back, as React restores a controlled
   * range input after its change handler returns.
   * @param event - The range input's native input event.
   */
  onSeekInput(event: Event): void {
    const element = event.target as HTMLInputElement
    this.onSeek?.(Number(element.value))
    element.value = String(this.seekValue())
  }

  /**
   * Reports a volume change and writes the controlled value back.
   * @param event - The range input's native input event.
   */
  onVolumeInput(event: Event): void {
    const element = event.target as HTMLInputElement
    this.onVolumeChange?.(Number(element.value))
    element.value = String(this.volume)
  }

  /**
   * Formats seconds as `m:ss` for the template.
   * @param seconds - Seconds to format.
   * @returns The formatted string.
   */
  formatTime(seconds: number): string {
    return formatTime(seconds)
  }

  /**
   * Applies React's controlled values after every change detection cycle, once
   * Angular has inserted any newly created `@if` / `@else` view.
   */
  ngAfterViewChecked(): void {
    this.syncControlledInputs()
  }

  /** Re-applies React's controlled `value` to the live range inputs. */
  private syncControlledInputs(): void {
    const seek = this.seekInputRef?.nativeElement
    if (seek && seek.value !== String(this.seekValue())) seek.value = String(this.seekValue())
    const volumeElement = this.volumeInputRef?.nativeElement
    if (
      volumeElement &&
      typeof this.volume === 'number' &&
      volumeElement.value !== String(this.volume)
    ) {
      volumeElement.value = String(this.volume)
    }
  }
}
