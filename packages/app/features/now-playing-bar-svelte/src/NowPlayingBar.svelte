<!--
  NowPlayingBar: the Svelte counterpart of
  `@molecule/app-now-playing-bar-react`'s `NowPlayingBar` — track artwork,
  title/artist, transport controls, scrubber and volume slider. Same props
  (React names), same ClassMap tokens and inline styles, same DOM for the same
  input. Every visible string goes through `t()` so a locale switch re-renders
  it; the `trailing` node prop is a Svelte snippet.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { formatTime } from './format.js'
  import type { NowPlayingBarProps } from './types.js'

  let {
    track,
    isPlaying,
    onPlay,
    onPause,
    onNext,
    onPrev,
    currentTime,
    duration,
    onSeek,
    volume,
    onVolumeChange,
    trailing,
    className,
  }: NowPlayingBarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** The root class list shared by both states. */
  const rootClasses = $derived(
    cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 3), className),
  )
  /** The playback position the controlled scrubber shows. */
  const seekValue = $derived(Math.min(currentTime, duration > 0 ? duration : 0))
  /** The scrubber's upper bound (`duration > 0 ? duration : 0`). */
  const seekMax = $derived(duration > 0 ? duration : 0)

  const emptyLabel = $derived(t('nowPlaying.empty', {}, { defaultValue: 'Nothing playing' }))
  const playLabel = $derived(
    isPlaying
      ? t('nowPlaying.aria.pause', {}, { defaultValue: 'Pause' })
      : t('nowPlaying.aria.play', {}, { defaultValue: 'Play' }),
  )
  const prevLabel = $derived(t('nowPlaying.aria.prev', {}, { defaultValue: 'Previous track' }))
  const nextLabel = $derived(t('nowPlaying.aria.next', {}, { defaultValue: 'Next track' }))
  const seekLabel = $derived(t('nowPlaying.aria.seek', {}, { defaultValue: 'Seek' }))
  const volumeLabel = $derived(t('nowPlaying.aria.volume', {}, { defaultValue: 'Volume' }))
  const artworkAlt = $derived(
    t(
      'nowPlaying.aria.artwork',
      { title: track?.title ?? '' },
      { defaultValue: 'Artwork for {{title}}' },
    ),
  )
  const regionLabel = $derived(
    t(
      'nowPlaying.aria.region',
      { title: track?.title ?? '' },
      { defaultValue: 'Now playing: {{title}}' },
    ),
  )

  /** React's play/pause toggle. */
  function handleToggle(): void {
    if (isPlaying) onPause()
    else onPlay()
  }

  /**
   * Applies React's controlled `value` to a native input: the property AND the
   * content attribute (via `defaultValue`), re-applied when the state changes.
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
   * Seeks and writes the controlled value back, as React restores a controlled
   * range input after its change handler returns.
   * @param event - The range input's native input event.
   */
  function handleSeek(event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    onSeek(Number(element.value))
    element.value = String(seekValue)
    element.defaultValue = String(seekValue)
  }

  /**
   * Reports a volume change and writes the controlled value back.
   * @param event - The range input's native input event.
   */
  function handleVolume(event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    onVolumeChange?.(Number(element.value))
    element.value = String(volume)
    element.defaultValue = String(volume)
  }
</script>

{#if track == null}
  <div
    role="region"
    aria-label={emptyLabel}
    data-mol-id="now-playing-bar"
    data-mol-empty="true"
    class={rootClasses}
  >
    <span class={cm.cn(cm.textSize('sm'), cm.textMuted)} data-mol-id="now-playing-bar-empty">
      {emptyLabel}
    </span>
  </div>
{:else}
  <div role="region" aria-label={regionLabel} data-mol-id="now-playing-bar" class={rootClasses}>
    <div
      class={cm.cn(cm.shrink0)}
      data-mol-id="now-playing-bar-artwork"
      style="width: 56px; height: 56px"
    >
      {#if track.artwork}
        <img
          src={track.artwork}
          alt={artworkAlt}
          style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px"
        />
      {:else}
        <div
          aria-hidden="true"
          class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
          style="width: 100%; height: 100%; border-radius: 6px"
        ></div>
      {/if}
    </div>

    <div
      class={cm.cn(cm.stack(0))}
      data-mol-id="now-playing-bar-meta"
      style="min-width: 0px; flex: 1 1 0%"
    >
      <span
        class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        data-mol-id="now-playing-bar-title"
        style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block"
      >
        {track.title}
      </span>
      <span
        class={cm.textSize('xs')}
        data-mol-id="now-playing-bar-artist"
        style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block"
      >
        {track.artist}
      </span>
    </div>

    <div
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}
      data-mol-id="now-playing-bar-transport"
    >
      {#if onPrev}
        <button
          type="button"
          onclick={(event) => onPrev?.(event)}
          aria-label={prevLabel}
          data-mol-id="now-playing-bar-prev"
          class={cm.cn(cm.cursorPointer)}
        >
          ⏮
        </button>
      {/if}
      <button
        type="button"
        onclick={handleToggle}
        aria-label={playLabel}
        aria-pressed={isPlaying}
        data-mol-id="now-playing-bar-play"
        class={cm.cn(cm.cursorPointer)}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      {#if onNext}
        <button
          type="button"
          onclick={(event) => onNext?.(event)}
          aria-label={nextLabel}
          data-mol-id="now-playing-bar-next"
          class={cm.cn(cm.cursorPointer)}
        >
          ⏭
        </button>
      {/if}
    </div>

    <div
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
      data-mol-id="now-playing-bar-scrubber"
      style="flex: 2 1 0%; min-width: 0px"
    >
      <span class={cm.textSize('xs')} data-mol-id="now-playing-bar-current-time">
        {formatTime(currentTime)}
      </span>
      <input
        type="range"
        min="0"
        max={seekMax}
        step="0.1"
        use:rangeValue={seekValue}
        oninput={handleSeek}
        aria-label={seekLabel}
        data-mol-id="now-playing-bar-seek"
        style="flex: 1 1 0%; min-width: 0px"
      />
      <span class={cm.textSize('xs')} data-mol-id="now-playing-bar-duration">
        {formatTime(duration)}
      </span>
    </div>

    {#if onVolumeChange && typeof volume === 'number'}
      <div
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}
        data-mol-id="now-playing-bar-volume"
        style="width: 120px"
      >
        <span aria-hidden="true">{volume === 0 ? '🔇' : '🔊'}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          use:rangeValue={volume}
          oninput={handleVolume}
          aria-label={volumeLabel}
          data-mol-id="now-playing-bar-volume-slider"
          style="flex: 1 1 0%; min-width: 0px"
        />
      </div>
    {/if}

    {#if trailing}
      <div class={cm.cn(cm.shrink0)} data-mol-id="now-playing-bar-trailing">
        {@render trailing?.()}
      </div>
    {/if}
  </div>
{/if}
