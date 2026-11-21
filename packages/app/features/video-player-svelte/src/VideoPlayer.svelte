<!--
  VideoPlayer: the Svelte counterpart of `@molecule/app-video-player-react`'s
  `VideoPlayer` — HTML5 video player chrome (play/pause, scrub bar,
  elapsed/total time, mute toggle, fullscreen) over a `<video>` element whose
  native controls are hidden. The `<video>` always carries the captions
  `<track>` (React renders it unconditionally too): with no `captionsSrc`
  (an empty one included) it is a captions track with no source yet. Same
  props, same DOM for the same input, same callbacks.

  The template's whitespace is deliberate: every element sits adjacent to the
  next with no whitespace-only text between siblings React does not render.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { VideoPlayerProps } from './types.js'

  let {
    src,
    poster,
    captionsSrc,
    captionsLang = 'en',
    captionsLabel,
    autoPlay,
    defaultMuted,
    onPlay,
    onPause,
    onEnded,
    className,
  }: VideoPlayerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let video: HTMLVideoElement | undefined = $state()
  /**
   * React's `useState(!!autoPlay)` initializer: captured once, at mount.
   * @returns The initial playing state.
   */
  function initialPlaying(): boolean {
    return !!autoPlay
  }
  /**
   * React's `useState(!!defaultMuted || !!autoPlay)` initializer: captured
   * once, at mount.
   * @returns The initial muted state.
   */
  function initialMuted(): boolean {
    return !!defaultMuted || !!autoPlay
  }
  // A later `autoPlay`/`defaultMuted` change does not reset them.
  let playing = $state(initialPlaying())
  let muted = $state(initialMuted())
  let duration = $state(0)
  let current = $state(0)

  $effect(() => {
    const element = video
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

  /** Toggles play/pause on the video element (React's `toggle`). */
  function toggle(): void {
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
  function onSeek(event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    if (video) video.currentTime = Number(element.value)
    element.value = String(current)
  }

  /** Toggles the muted state on the media element and in the state (React's `toggleMute`). */
  function toggleMute(): void {
    if (!video) return
    video.muted = !video.muted
    muted = video.muted
  }

  /** Requests or exits fullscreen for the video element (React's `toggleFullscreen`). */
  function toggleFullscreen(): void {
    if (!video) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void video.requestFullscreen?.()
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
   * Formats a time value in seconds as `m:ss`, React's `fmtTime`.
   * @param s - The time in seconds.
   * @returns The formatted time.
   */
  function fmtTime(s: number): string {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }
</script>

<div
  class={cm.cn(cm.position('relative'), cm.bgScrim, className)}
  style="border-radius: 8px; overflow: hidden"
>
  <video
    bind:this={video}
    {src}
    {poster}
    autoplay={autoPlay}
    {muted}
    style="display: block; width: 100%; height: auto"
    ><track
      kind="captions"
      src={captionsSrc || undefined}
      srclang={captionsLang}
      label={captionsLabel ?? t('video.captions', {}, { defaultValue: 'Captions' })}
      default
    /></video
  >
  <div
    class={cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.bgScrim,
      cm.textOnTone,
      cm.sp('px', 3),
      cm.sp('py', 2),
    )}
    style="position: absolute; left: 0px; right: 0px; bottom: 0px"
  >
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={playing
        ? t('video.pause', {}, { defaultValue: 'Pause' })
        : t('video.play', {}, { defaultValue: 'Play' })}>{playing ? '⏸' : '▶'}</Button
    ><span class={cm.textSize('xs')} style="min-width: 64px"
      >{`${fmtTime(current)} / ${fmtTime(duration)}`}</span
    ><input
      type="range"
      min="0"
      max={duration || 0}
      step="0.1"
      use:rangeValue={current}
      oninput={onSeek}
      aria-label={t('video.seek', {}, { defaultValue: 'Seek' })}
      class={cm.flex1}
    /><Button
      variant="ghost"
      size="sm"
      onClick={toggleMute}
      aria-label={muted
        ? t('video.unmute', {}, { defaultValue: 'Unmute' })
        : t('video.mute', {}, { defaultValue: 'Mute' })}>{muted ? '🔇' : '🔊'}</Button
    ><Button
      variant="ghost"
      size="sm"
      onClick={toggleFullscreen}
      aria-label={t('video.fullscreen', {}, { defaultValue: 'Fullscreen' })}>⛶</Button
    >
  </div>
</div>
