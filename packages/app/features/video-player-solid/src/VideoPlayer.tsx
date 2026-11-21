/**
 * Solid HTML5 video player: play/pause, scrub bar, elapsed/total time, mute and
 * fullscreen, over a `<video>` element whose native controls are hidden.
 *
 * Solid counterpart of `@molecule/app-video-player-react`'s `VideoPlayer` — the
 * same props (React names), the same DOM for the same input, and the same
 * callbacks.
 *
 * @module
 */

import { type Component, createSignal, onCleanup, onMount } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { VideoPlayerProps } from './types.js'

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
 * @param props - Component props (see {@link VideoPlayerProps}).
 * @returns The rendered video player.
 */
export const VideoPlayer: Component<VideoPlayerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  let video: HTMLVideoElement | undefined
  // React's `useState(!!autoPlay)` / `useState(!!defaultMuted || !!autoPlay)`:
  // captured once, at mount — a later prop change does not reset them.
  const [playing, setPlaying] = createSignal(!!props.autoPlay)
  const [muted, setMuted] = createSignal(!!props.defaultMuted || !!props.autoPlay)
  const [duration, setDuration] = createSignal(0)
  const [current, setCurrent] = createSignal(0)

  /** Reads the position from the media element (React's `timeupdate`). */
  const onTimeUpdate = (): void => {
    if (video) setCurrent(video.currentTime)
  }
  /** Reads the duration from the media element (React's `loadedmetadata`). */
  const onLoadedMetadata = (): void => {
    if (video) setDuration(video.duration)
  }
  /** Marks the player as playing and calls `onPlay` (React's `play`). */
  const onPlayEvent = (): void => {
    setPlaying(true)
    props.onPlay?.()
  }
  /** Marks the player as paused and calls `onPause` (React's `pause`). */
  const onPauseEvent = (): void => {
    setPlaying(false)
    props.onPause?.()
  }
  /** Marks the player as paused and calls `onEnded` (React's `ended`). */
  const onEndedEvent = (): void => {
    setPlaying(false)
    props.onEnded?.()
  }

  onMount(() => {
    if (!video) return
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('play', onPlayEvent)
    video.addEventListener('pause', onPauseEvent)
    video.addEventListener('ended', onEndedEvent)
  })

  onCleanup(() => {
    if (!video) return
    video.removeEventListener('timeupdate', onTimeUpdate)
    video.removeEventListener('loadedmetadata', onLoadedMetadata)
    video.removeEventListener('play', onPlayEvent)
    video.removeEventListener('pause', onPauseEvent)
    video.removeEventListener('ended', onEndedEvent)
  })

  /** Toggles play/pause on the video element (React's `toggle`). */
  const toggle = (): void => {
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  /**
   * Seeks the video to a position in seconds (React's `seek`). React restores
   * a controlled input to the state value right after the change handler
   * returns, so the range is written back too.
   *
   * @param event - The range input's native input event.
   */
  const onSeek = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    if (video) video.currentTime = Number(element.value)
    element.value = String(current())
  }

  /** Toggles the muted state on the video element and in the state (React's `toggleMute`). */
  const toggleMute = (): void => {
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  /** Requests or exits fullscreen for the video element (React's `toggleFullscreen`). */
  const toggleFullscreen = (): void => {
    if (!video) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void video.requestFullscreen?.()
  }

  return (
    <div
      class={cm.cn(cm.position('relative'), cm.bgScrim, props.className)}
      style={{ 'border-radius': '8px', overflow: 'hidden' }}
    >
      <video
        ref={(el) => (video = el)}
        src={props.src}
        poster={props.poster}
        autoplay={props.autoPlay}
        muted={muted()}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {/* The captions track renders on every <video>, as React's does;
            without a `captionsSrc` (an empty one included) it is a captions
            track with no source. */}
        <track
          kind="captions"
          src={props.captionsSrc || undefined}
          srclang={props.captionsLang ?? 'en'}
          label={props.captionsLabel ?? t('video.captions', {}, { defaultValue: 'Captions' })}
          default
        />
      </video>
      <div
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.bgScrim,
          cm.textOnTone,
          cm.sp('px', 3),
          cm.sp('py', 2),
        )}
        style={{ position: 'absolute', left: '0px', right: '0px', bottom: '0px' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          aria-label={
            playing()
              ? t('video.pause', {}, { defaultValue: 'Pause' })
              : t('video.play', {}, { defaultValue: 'Play' })
          }
        >
          {playing() ? '⏸' : '▶'}
        </Button>
        <span class={cm.textSize('xs')} style={{ 'min-width': '64px' }}>
          {`${fmtTime(current())} / ${fmtTime(duration())}`}
        </span>
        <input
          type="range"
          min={0}
          max={duration() || 0}
          step={0.1}
          attr:value={current()}
          onInput={onSeek}
          aria-label={t('video.seek', {}, { defaultValue: 'Seek' })}
          class={cm.flex1}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          aria-label={
            muted()
              ? t('video.unmute', {}, { defaultValue: 'Unmute' })
              : t('video.mute', {}, { defaultValue: 'Mute' })
          }
        >
          {muted() ? '🔇' : '🔊'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          aria-label={t('video.fullscreen', {}, { defaultValue: 'Fullscreen' })}
        >
          ⛶
        </Button>
      </div>
    </div>
  )
}
