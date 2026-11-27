/**
 * Solid HTML5 audio player: play/pause, scrub bar, elapsed/total time and a
 * mute toggle, over a hidden `<audio>` element.
 *
 * Solid counterpart of `@molecule/app-audio-player-react`'s `AudioPlayer` —
 * the same props (React names), the same DOM for the same input, and the same
 * callbacks.
 *
 * @module
 */

import { type Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { AudioPlayerProps } from './types.js'

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
 * visualizer slot. Use for podcasts, voice notes, music previews, narrated
 * lessons.
 *
 * @param props - Component props (see {@link AudioPlayerProps}).
 * @returns The rendered audio player.
 */
export const AudioPlayer: Component<AudioPlayerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  let audio: HTMLAudioElement | undefined
  // React's `useState(!!autoPlay)` / `useState(!!defaultMuted)`: captured once,
  // at mount — a later prop change does not reset them.
  const [playing, setPlaying] = createSignal(!!props.autoPlay)
  const [muted, setMuted] = createSignal(!!props.defaultMuted)
  const [duration, setDuration] = createSignal(0)
  const [current, setCurrent] = createSignal(0)
  let trackElement: HTMLTrackElement | undefined
  const [caption, setCaption] = createSignal('')

  // The <audio> element is hidden behind the custom controls, so the browser
  // paints no captions: the track is set to `hidden` (it still fires
  // `cuechange`) and the player shows the active cue text itself. The effect
  // re-runs when `captions` changes; its cleanup removes the listener and
  // clears the caption.
  createEffect(() => {
    const textTrack = trackElement?.track
    if (!props.captions || !textTrack) {
      setCaption('')
      return
    }
    textTrack.mode = 'hidden'
    const onCue = (): void => {
      const cues = textTrack.activeCues ? Array.from(textTrack.activeCues) : []
      setCaption(cues.map((cue) => ('text' in cue ? String(cue.text) : '')).join('\n'))
    }
    textTrack.addEventListener('cuechange', onCue)
    onCleanup(() => {
      textTrack.removeEventListener('cuechange', onCue)
      setCaption('')
    })
  })

  /** Reads the position from the media element (React's `timeupdate`). */
  const onTimeUpdate = (): void => {
    if (audio) setCurrent(audio.currentTime)
  }
  /** Reads the duration from the media element (React's `loadedmetadata`). */
  const onLoadedMetadata = (): void => {
    if (audio) setDuration(audio.duration)
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
    if (!audio) return
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlayEvent)
    audio.addEventListener('pause', onPauseEvent)
    audio.addEventListener('ended', onEndedEvent)
  })

  onCleanup(() => {
    if (!audio) return
    audio.removeEventListener('timeupdate', onTimeUpdate)
    audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    audio.removeEventListener('play', onPlayEvent)
    audio.removeEventListener('pause', onPauseEvent)
    audio.removeEventListener('ended', onEndedEvent)
  })

  /** Toggles play/pause on the audio element (React's `toggle`). */
  const toggle = (): void => {
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  /**
   * Seeks the audio element to a position in seconds (React's `seek`). React
   * restores a controlled input to the state value right after the change
   * handler returns, so the range is written back too.
   *
   * @param event - The range input's native input event.
   */
  const onSeek = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    if (audio) audio.currentTime = Number(element.value)
    element.value = String(current())
  }

  /** Toggles the muted state on the media element and in the state (React's `toggleMute`). */
  const toggleMute = (): void => {
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  return (
    <div class={cm.cn(cm.stack(2), cm.sp('p', 3), props.className)}>
      <audio
        ref={(el) => (audio = el)}
        src={props.src}
        autoplay={props.autoPlay}
        muted={muted()}
        preload="metadata"
        style={{ display: 'none' }}
      >
        <track
          ref={(el) => (trackElement = el)}
          kind="captions"
          src={props.captions}
          srclang={props.captionsLang}
          label={props.captionsLabel ?? t('audio.captions', {}, { defaultValue: 'Captions' })}
        />
      </audio>
      <ResolveNode node={props.title}>
        {(title, hasTitle) => (
          <ResolveNode node={props.subtitle}>
            {(subtitle, hasSubtitle) => (
              <Show when={hasTitle() || hasSubtitle()}>
                <header class={cm.stack(0)}>
                  <Show when={hasTitle()}>
                    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {title()}
                    </span>
                  </Show>
                  <Show when={hasSubtitle()}>
                    <span class={cm.textSize('xs')}>{subtitle()}</span>
                  </Show>
                </header>
              </Show>
            )}
          </ResolveNode>
        )}
      </ResolveNode>
      {props.visualizer}
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          data-mol-id="audio-player-toggle"
          aria-label={
            playing()
              ? t('audio.pause', {}, { defaultValue: 'Pause' })
              : t('audio.play', {}, { defaultValue: 'Play' })
          }
        >
          <span aria-hidden="true">{playing() ? '⏸' : '▶'}</span>
        </Button>
        <span class={cm.textSize('xs')} style={{ 'min-width': '64px' }}>
          {`${fmt(current())} / ${fmt(duration())}`}
        </span>
        <input
          type="range"
          min={0}
          max={duration() || 0}
          step={0.1}
          attr:value={current()}
          onInput={onSeek}
          aria-label={t('audio.seek', {}, { defaultValue: 'Seek' })}
          data-mol-id="audio-player-seek"
          class={cm.flex1}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          data-mol-id="audio-player-mute"
          aria-label={
            muted()
              ? t('audio.unmute', {}, { defaultValue: 'Unmute' })
              : t('audio.mute', {}, { defaultValue: 'Mute' })
          }
        >
          <span aria-hidden="true">{muted() ? '🔇' : '🔊'}</span>
        </Button>
      </div>
      {props.captions && (
        <p
          aria-live="polite"
          data-mol-id="audio-player-captions"
          lang={props.captionsLang}
          class={cm.textSize('sm')}
          style={{ 'min-height': '1.5em', 'white-space': 'pre-line' }}
        >
          {caption()}
        </p>
      )}
    </div>
  )
}
