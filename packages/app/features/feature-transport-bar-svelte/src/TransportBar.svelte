<!--
  TransportBar: the Svelte counterpart of
  `@molecule/app-feature-transport-bar-react`'s `TransportBar` — the playback
  transport bar (play/pause, stop, skip, record, loop) with the optional
  time-display slot. Same props, same DOM for the same input, same callbacks.
  All visual styling routes through ClassMap tokens and the state whether a
  control renders is React's (a missing handler renders no button).

  The template's whitespace is deliberate: every element sits adjacent to the
  next with no whitespace-only text between siblings React does not render.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { TransportBarProps } from './types.js'

  let {
    isPlaying,
    isRecording,
    canStop = true,
    canSkip = true,
    loop,
    onPlayToggle,
    onStop,
    onSkipBack,
    onSkipForward,
    onRecordToggle,
    onLoopToggle,
    timeDisplay,
    children,
    className,
  }: TransportBarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** React's `cm.cn(cm.cursorPointer, cm.sp('p', 1))` for every control. */
  const controlClass = $derived(cm.cn(cm.cursorPointer, cm.sp('p', 1)))

  /** React's `timeDisplay ?? children`. */
  const slotValue = $derived(
    timeDisplay === undefined || timeDisplay === null ? children : timeDisplay,
  )

  /** React's `{slot && …}`: a truthy slot renders the wrapper. */
  const rendersSlot = $derived(
    slotValue !== undefined &&
      slotValue !== null &&
      slotValue !== '' &&
      slotValue !== 0 &&
      slotValue !== false,
  )

  /**
   * React's inline button style — only what ClassMap does not expose
   * (`background: transparent`, `border: none`). Applied through the CSSOM, the
   * same path React's style object takes: Svelte folds a static `style:` value
   * into one `cssText` write, which serializes the `background` shorthand
   * differently.
   *
   * @param node - The button element.
   */
  function buttonStyle(node: HTMLButtonElement): void {
    node.style.setProperty('background', 'transparent')
    node.style.setProperty('border', 'none')
    node.style.setProperty('cursor', 'pointer')
    node.style.setProperty('padding', '0')
  }
</script>

{#snippet content(
  value: TransportBarProps['timeDisplay'],
)}{#if typeof value === 'function'}{@render value()}{:else}{value}{/if}{/snippet}

<div
  role="toolbar"
  aria-label={t('transportBar.aria.region', {}, { defaultValue: 'Playback transport controls' })}
  data-mol-id="transport-bar"
  class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2), className)}
>
  {#if onSkipBack}<button
      type="button"
      onclick={(event) => onSkipBack?.(event)}
      disabled={!canSkip}
      aria-label={t('transportBar.aria.skipBack', {}, { defaultValue: 'Skip backward' })}
      data-mol-id="transport-bar-skip-back"
      class={controlClass}
      use:buttonStyle><span aria-hidden="true">⏮</span></button
    >{/if}<button
    type="button"
    onclick={(event) => onPlayToggle(event)}
    aria-label={isPlaying
      ? t('transportBar.aria.pause', {}, { defaultValue: 'Pause' })
      : t('transportBar.aria.play', {}, { defaultValue: 'Play' })}
    aria-pressed={isPlaying}
    data-mol-id="transport-bar-play-toggle"
    data-state={isPlaying ? 'playing' : 'paused'}
    class={controlClass}
    use:buttonStyle><span aria-hidden="true">{isPlaying ? '⏸' : '▶'}</span></button
  ><button
    type="button"
    onclick={(event) => onStop(event)}
    disabled={!canStop}
    aria-label={t('transportBar.aria.stop', {}, { defaultValue: 'Stop' })}
    data-mol-id="transport-bar-stop"
    class={controlClass}
    use:buttonStyle><span aria-hidden="true">⏹</span></button
  >{#if onSkipForward}<button
      type="button"
      onclick={(event) => onSkipForward?.(event)}
      disabled={!canSkip}
      aria-label={t('transportBar.aria.skipForward', {}, { defaultValue: 'Skip forward' })}
      data-mol-id="transport-bar-skip-forward"
      class={controlClass}
      use:buttonStyle><span aria-hidden="true">⏭</span></button
    >{/if}{#if onRecordToggle}<button
      type="button"
      onclick={(event) => onRecordToggle?.(event)}
      aria-label={isRecording
        ? t('transportBar.aria.stopRecording', {}, { defaultValue: 'Stop recording' })
        : t('transportBar.aria.record', {}, { defaultValue: 'Record' })}
      aria-pressed={!!isRecording}
      data-mol-id="transport-bar-record-toggle"
      data-state={isRecording ? 'recording' : 'idle'}
      class={controlClass}
      use:buttonStyle><span aria-hidden="true">●</span></button
    >{/if}{#if onLoopToggle}<button
      type="button"
      onclick={(event) => onLoopToggle?.(event)}
      aria-label={loop
        ? t('transportBar.aria.loopOn', {}, { defaultValue: 'Disable loop' })
        : t('transportBar.aria.loopOff', {}, { defaultValue: 'Enable loop' })}
      aria-pressed={!!loop}
      data-mol-id="transport-bar-loop-toggle"
      data-state={loop ? 'on' : 'off'}
      class={controlClass}
      use:buttonStyle><span aria-hidden="true">↻</span></button
    >{/if}{#if rendersSlot}<div
      data-mol-id="transport-bar-time-display"
      class={cm.cn(cm.textSize('sm'), cm.sp('px', 2))}
    >
      {@render content(slotValue)}
    </div>{:else if typeof slotValue === 'number'}{slotValue}{/if}
</div>
