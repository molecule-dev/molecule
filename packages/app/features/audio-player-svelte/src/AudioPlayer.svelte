<!--
  AudioPlayer: the Svelte counterpart of `@molecule/app-audio-player-react`'s
  `AudioPlayer` — HTML5 audio player chrome (play/pause, scrub, time, mute,
  optional visualizer slot) over a hidden `<audio>` element. Same props, same
  DOM for the same input, same callbacks. Node-valued props (`title`,
  `subtitle`, `visualizer`) are snippets, or plain values passed verbatim.

  The template's whitespace is deliberate: every element sits adjacent to the
  next with no whitespace-only text between siblings React does not render.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { AudioPlayerProps } from './types.js'

  let {
    src,
    title,
    subtitle,
    visualizer,
    captions,
    captionsLang,
    captionsLabel,
    defaultMuted,
    autoPlay,
    onPlay,
    onPause,
    onEnded,
    className,
  }: AudioPlayerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let audio: HTMLAudioElement | undefined = $state()
  /**
   * React's `useState(!!autoPlay)` initializer: captured once, at mount.
   * @returns The initial playing state.
   */
  function initialPlaying(): boolean {
    return !!autoPlay
  }
  /**
   * React's `useState(!!defaultMuted)` initializer: captured once, at mount.
   * @returns The initial muted state.
   */
  function initialMuted(): boolean {
    return !!defaultMuted
  }
  // A later `autoPlay`/`defaultMuted` change does not reset them.
  let playing = $state(initialPlaying())
  let muted = $state(initialMuted())
  let duration = $state(0)
  let current = $state(0)
  let trackElement: HTMLTrackElement | undefined = $state()
  let caption = $state('')

  // The <audio> element is hidden behind the custom controls, so the browser
  // paints no captions: the track is set to `hidden` (it still fires
  // `cuechange`) and the player shows the active cue text itself. The effect
  // re-runs when `captions` changes; its cleanup removes the listener and
  // clears the caption.
  $effect(() => {
    const textTrack = trackElement?.track
    if (!captions || !textTrack) {
      caption = ''
      return
    }
    textTrack.mode = 'hidden'
    /** Shows the active cues' text (React's `onCue`). */
    const onCue = (): void => {
      const cues = textTrack.activeCues ? Array.from(textTrack.activeCues) : []
      caption = cues.map((cue) => ('text' in cue ? String(cue.text) : '')).join('\n')
    }
    textTrack.addEventListener('cuechange', onCue)
    return () => {
      textTrack.removeEventListener('cuechange', onCue)
      caption = ''
    }
  })

  $effect(() => {
    const element = audio
    if (!element) return
    /** Reads the position from the media element (React's `timeupdate`). */
    const onTimeUpdate = (): void => {
      current = element.currentTime
    }
    /** Reads the duration from the media element (React's `loadedmetadata`). */
    const onLoadedMetadata = (): void => {
      duration = element.duration
    }
    /** Marks the player as playing and calls `onPlay` (React's `play`). */
    const onPlayEvent = (): void => {
      playing = true
      onPlay?.()
    }
    /** Marks the player as paused and calls `onPause` (React's `pause`). */
    const onPauseEvent = (): void => {
      playing = false
      onPause?.()
    }
    /** Marks the player as paused and calls `onEnded` (React's `ended`). */
    const onEndedEvent = (): void => {
      playing = false
      onEnded?.()
    }
    element.addEventListener('timeupdate', onTimeUpdate)
    element.addEventListener('loadedmetadata', onLoadedMetadata)
    element.addEventListener('play', onPlayEvent)
    element.addEventListener('pause', onPauseEvent)
    element.addEventListener('ended', onEndedEvent)
    return () => {
      element.removeEventListener('timeupdate', onTimeUpdate)
      element.removeEventListener('loadedmetadata', onLoadedMetadata)
      element.removeEventListener('play', onPlayEvent)
      element.removeEventListener('pause', onPauseEvent)
      element.removeEventListener('ended', onEndedEvent)
    }
  })

  /** Toggles play/pause on the audio element (React's `toggle`). */
  function toggle(): void {
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
  function onSeek(event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    if (audio) audio.currentTime = Number(element.value)
    element.value = String(current)
  }

  /** Toggles the muted state on the media element and in the state (React's `toggleMute`). */
  function toggleMute(): void {
    if (!audio) return
    audio.muted = !audio.muted
    muted = audio.muted
  }

  /**
   * Whether React's `{node && …}` branch renders for a node-valued prop: a
   * snippet always does, a plain value only when truthy.
   * @param value - The node-valued prop.
   * @returns True when React renders it.
   */
  function shows(value: unknown): boolean {
    return typeof value === 'function' ? true : !!value
  }

  /**
   * Applies React's controlled `value` to a native input: the property AND the
   * content attribute (via the `defaultValue` property), re-applied when the
   * state changes.
   * @param node - The input element.
   * @param position - The controlled value.
   * @returns The action with an update that re-applies on prop changes.
   */
  function rangeValue(node: HTMLInputElement, position: number): { update(next: number): void } {
    const apply = (text: string): void => {
      if (node.value !== text) node.value = text
      if (node.defaultValue !== text) node.defaultValue = text
    }
    apply(String(position))
    return { update: (next: number) => apply(String(next)) }
  }

  /**
   * Formats a duration in seconds as M:SS (90 → `1:30`), React's `fmt`.
   * @param s - The duration in seconds.
   * @returns The formatted time.
   */
  function fmt(s: number): string {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }
</script>

{#snippet content(
  value: AudioPlayerProps['title'],
  fallback: string,
)}{#if value === undefined || value === null}{fallback}{:else if typeof value === 'function'}{@render value?.()}{:else}{value}{/if}{/snippet}

<div class={cm.cn(cm.stack(2), cm.sp('p', 3), className)}>
  <audio
    bind:this={audio}
    {src}
    autoplay={autoPlay}
    {muted}
    preload="metadata"
    style="display: none"
    ><track
      bind:this={trackElement}
      kind="captions"
      src={captions}
      srclang={captionsLang}
      label={captionsLabel ?? t('audio.captions', {}, { defaultValue: 'Captions' })}
    /></audio
  >{#if shows(title) || shows(subtitle)}<PresentWhileContent tag="header" class={cm.stack(0)}>
      {#if shows(title)}<PresentWhileContent
          tag="span"
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          >{@render content(title, '')}</PresentWhileContent
        >{/if}{#if shows(subtitle)}<PresentWhileContent tag="span" class={cm.textSize('xs')}
          >{@render content(subtitle, '')}</PresentWhileContent
        >{/if}
    </PresentWhileContent>{/if}{#if shows(visualizer)}{@render content(visualizer, '')}{/if}
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      data-mol-id="audio-player-toggle"
      aria-label={playing
        ? t('audio.pause', {}, { defaultValue: 'Pause' })
        : t('audio.play', {}, { defaultValue: 'Play' })}
      ><span aria-hidden="true">{playing ? '⏸' : '▶'}</span></Button
    ><span class={cm.textSize('xs')} style="min-width: 64px"
      >{`${fmt(current)} / ${fmt(duration)}`}</span
    ><input
      type="range"
      min="0"
      max={duration || 0}
      step="0.1"
      use:rangeValue={current}
      oninput={onSeek}
      aria-label={t('audio.seek', {}, { defaultValue: 'Seek' })}
      data-mol-id="audio-player-seek"
      class={cm.flex1}
    /><Button
      variant="ghost"
      size="sm"
      onClick={toggleMute}
      data-mol-id="audio-player-mute"
      aria-label={muted
        ? t('audio.unmute', {}, { defaultValue: 'Unmute' })
        : t('audio.mute', {}, { defaultValue: 'Mute' })}
      ><span aria-hidden="true">{muted ? '🔇' : '🔊'}</span></Button
    >
  </div>
  {#if captions}<p
      aria-live="polite"
      data-mol-id="audio-player-captions"
      class={cm.textSize('sm')}
      style="min-height: 1.5em; white-space: pre-line"
    >
      {caption}
    </p>{/if}
</div>
