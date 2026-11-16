/**
 * Solid now-playing bar: artwork, title / artist, transport controls, scrubber
 * and volume slider.
 *
 * Solid counterpart of `@molecule/app-now-playing-bar-react`'s `NowPlayingBar` —
 * the same props (React names), the same ClassMap tokens and inline styles, and
 * the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { NowPlayingBarProps, NowPlayingTrack } from './types.js'

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

/** The inline style every truncated label carries (React's truncate object). */
const TRUNCATE = {
  display: 'block',
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
} as const

/**
 * Persistent now-playing bar: track artwork, title/artist, transport controls
 * (prev/play-pause/next), scrubber and volume slider.
 *
 * Sticky positioning is intentionally NOT enforced inside the component — the
 * caller wraps it in their own `position: sticky` / `fixed` container. All
 * styling routes through `getClassMap()`; all user-visible text routes through
 * `t()` so the bar translates via the companion locale bond.
 *
 * @param props - Component props (see {@link NowPlayingBarProps}).
 * @returns The now-playing bar element.
 */
export const NowPlayingBar: Component<NowPlayingBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** The loaded track (the full state renders only while one exists). */
  const track = (): NowPlayingTrack => props.track as NowPlayingTrack
  /** The playback position the controlled scrubber shows. */
  const seekValue = (): number =>
    Math.min(props.currentTime, props.duration > 0 ? props.duration : 0)
  /** The scrubber's upper bound (`duration > 0 ? duration : 0`). */
  const seekMax = (): number => (props.duration > 0 ? props.duration : 0)
  /** The root class list shared by both states. */
  const rootClasses = (): string =>
    cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 3), props.className)
  /** React's play/pause aria-label. */
  const playLabel = (): string =>
    props.isPlaying
      ? t('nowPlaying.aria.pause', {}, { defaultValue: 'Pause' })
      : t('nowPlaying.aria.play', {}, { defaultValue: 'Play' })
  /** The region's accessible name. */
  const regionLabel = (): string =>
    t(
      'nowPlaying.aria.region',
      { title: track().title },
      { defaultValue: 'Now playing: {{title}}' },
    )
  /** The artwork's alt text. */
  const artworkAlt = (): string =>
    t(
      'nowPlaying.aria.artwork',
      { title: track().title },
      { defaultValue: 'Artwork for {{title}}' },
    )

  /**
   * Seeks and writes the controlled value back, as React restores a
   * controlled range input after its change handler returns.
   *
   * @param event - The range input's native input event.
   */
  const handleSeek = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    props.onSeek(Number(element.value))
    element.value = String(seekValue())
  }

  /**
   * Reports a volume change and writes the controlled value back.
   *
   * @param event - The range input's native input event.
   */
  const handleVolume = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    props.onVolumeChange?.(Number(element.value))
    element.value = String(props.volume)
  }

  /** React's play/pause toggle. */
  const handleToggle = (): void => {
    if (props.isPlaying) props.onPause()
    else props.onPlay()
  }

  /** The compact empty state rendered when no track is loaded. */
  const emptyState = (): JSX.Element => {
    const emptyLabel = t('nowPlaying.empty', {}, { defaultValue: 'Nothing playing' })
    return (
      <div
        role="region"
        aria-label={emptyLabel}
        data-mol-id="now-playing-bar"
        data-mol-empty="true"
        class={rootClasses()}
      >
        <span class={cm.cn(cm.textSize('sm'), cm.textMuted)} data-mol-id="now-playing-bar-empty">
          {emptyLabel}
        </span>
      </div>
    )
  }

  /** The full bar for a loaded track. */
  const fullState = (): JSX.Element => (
    <div
      role="region"
      aria-label={regionLabel()}
      data-mol-id="now-playing-bar"
      class={rootClasses()}
    >
      <div
        class={cm.cn(cm.shrink0)}
        data-mol-id="now-playing-bar-artwork"
        style={{ height: '56px', width: '56px' }}
      >
        <Show
          when={track().artwork}
          fallback={
            <div
              aria-hidden="true"
              class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
              style={{ 'border-radius': '6px', height: '100%', width: '100%' }}
            />
          }
        >
          {(artwork) => (
            <img
              src={artwork()}
              alt={artworkAlt()}
              style={{
                'border-radius': '6px',
                height: '100%',
                'object-fit': 'cover',
                width: '100%',
              }}
            />
          )}
        </Show>
      </div>

      <div
        class={cm.cn(cm.stack(0))}
        data-mol-id="now-playing-bar-meta"
        style={{ flex: '1 1 0%', 'min-width': '0px' }}
      >
        <span
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          data-mol-id="now-playing-bar-title"
          style={TRUNCATE}
        >
          {track().title}
        </span>
        <span class={cm.textSize('xs')} data-mol-id="now-playing-bar-artist" style={TRUNCATE}>
          {track().artist}
        </span>
      </div>

      <div
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}
        data-mol-id="now-playing-bar-transport"
      >
        <Show when={props.onPrev}>
          {(onPrev) => (
            <button
              type="button"
              onClick={(event: MouseEvent) => onPrev()(event)}
              aria-label={t('nowPlaying.aria.prev', {}, { defaultValue: 'Previous track' })}
              data-mol-id="now-playing-bar-prev"
              class={cm.cn(cm.cursorPointer)}
            >
              {'⏮'}
            </button>
          )}
        </Show>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={playLabel()}
          aria-pressed={props.isPlaying}
          data-mol-id="now-playing-bar-play"
          class={cm.cn(cm.cursorPointer)}
        >
          {props.isPlaying ? '⏸' : '▶'}
        </button>
        <Show when={props.onNext}>
          {(onNext) => (
            <button
              type="button"
              onClick={(event: MouseEvent) => onNext()(event)}
              aria-label={t('nowPlaying.aria.next', {}, { defaultValue: 'Next track' })}
              data-mol-id="now-playing-bar-next"
              class={cm.cn(cm.cursorPointer)}
            >
              {'⏭'}
            </button>
          )}
        </Show>
      </div>

      <div
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        data-mol-id="now-playing-bar-scrubber"
        style={{ flex: '2 1 0%', 'min-width': '0px' }}
      >
        <span class={cm.textSize('xs')} data-mol-id="now-playing-bar-current-time">
          {formatTime(props.currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={seekMax()}
          step={0.1}
          attr:value={String(seekValue())}
          onInput={handleSeek}
          aria-label={t('nowPlaying.aria.seek', {}, { defaultValue: 'Seek' })}
          data-mol-id="now-playing-bar-seek"
          style={{ flex: '1 1 0%', 'min-width': '0px' }}
        />
        <span class={cm.textSize('xs')} data-mol-id="now-playing-bar-duration">
          {formatTime(props.duration)}
        </span>
      </div>

      <Show when={props.onVolumeChange && typeof props.volume === 'number'}>
        <div
          class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}
          data-mol-id="now-playing-bar-volume"
          style={{ width: '120px' }}
        >
          <span aria-hidden="true">{props.volume === 0 ? '🔇' : '🔊'}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            attr:value={String(props.volume)}
            onInput={handleVolume}
            aria-label={t('nowPlaying.aria.volume', {}, { defaultValue: 'Volume' })}
            data-mol-id="now-playing-bar-volume-slider"
            style={{ flex: '1 1 0%', 'min-width': '0px' }}
          />
        </div>
      </Show>

      <Show when={props.trailing}>
        <div class={cm.cn(cm.shrink0)} data-mol-id="now-playing-bar-trailing">
          {props.trailing}
        </div>
      </Show>
    </div>
  )

  return (
    <Show when={props.track} fallback={emptyState()}>
      {fullState()}
    </Show>
  )
}
