<!--
  ChannelStrip: one channel column of the mixer (React's internal
  `ChannelStrip`) — name header, vertical fader, pan knob, mute/solo buttons,
  optional sends row. Not exported: consumers use `AudioMixer`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyle } from '@molecule/app-ui-svelte'

  import { rangeValue } from './range-value.js'
  import type { Channel, ChannelChangePatch, Send } from './types.js'
  import { clampLevel, clampPan, MAX_LEVEL, MAX_PAN, MIN_LEVEL, MIN_PAN } from './utilities.js'

  /** Props accepted by {@link ChannelStrip}. */
  interface ChannelStripProps {
    /** The channel (or master channel) this strip shows. */
    channel: Channel
    /** Pixel height of the fader column. */
    faderHeight: number
    /** Translated mute button label. */
    muteLabel: string
    /** Translated solo button label. */
    soloLabel: string
    /** Translated letter the mute button shows (`audioMixer.button.muteInitial`). */
    muteInitial: string
    /** Translated letter the solo button shows (`audioMixer.button.soloInitial`). */
    soloInitial: string
    /** Translated sends row label. */
    sendsLabel: string
    /** Channel name the fader/pan/send labels are built from. */
    labelName: string
    /** Receives every patch this strip emits. */
    onChange?: (patch: ChannelChangePatch) => void
    /** Whether this strip is the master column. */
    isMaster: boolean
  }

  let {
    channel,
    faderHeight,
    muteLabel,
    soloLabel,
    muteInitial,
    soloInitial,
    sendsLabel,
    labelName,
    onChange,
    isMaster,
  }: ChannelStripProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const channelLevel = $derived(clampLevel(channel.level))
  const channelPan = $derived(clampPan(channel.pan))
  const faderAria = $derived(
    t('audioMixer.aria.fader', { name: labelName }, { defaultValue: '{{name}} fader' }),
  )
  const panAria = $derived(
    t('audioMixer.aria.pan', { name: labelName }, { defaultValue: '{{name}} pan' }),
  )

  /**
   * The accessible label of one send fader.
   * @param sendName - The send's label, or its id when unlabelled.
   * @returns The translated label.
   */
  function sendAria(sendName: string): string {
    return t(
      'audioMixer.aria.send',
      { channel: labelName, send: sendName },
      { defaultValue: '{{channel}} send to {{send}}' },
    )
  }

  /**
   * Classes for a strip toggle (mute / solo): solid when engaged, outline idle.
   * @param engaged - Whether the toggle is currently on.
   * @returns The resolved class string.
   */
  function toggleClass(engaged: boolean): string {
    return cm.cn(
      engaged
        ? cm.button({ variant: 'solid', color: 'primary', size: 'xs' })
        : cm.button({ variant: 'outline', size: 'xs' }),
      cm.touchTargetCompact,
    )
  }

  /**
   * Emit a fader patch with the new clamped level, then write the controlled
   * value back as React restores a controlled input.
   * @param event - The range input's native input event.
   */
  function handleFader(event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    onChange?.({ id: channel.id, level: clampLevel(parseFloat(element.value)) })
    element.value = String(channelLevel)
    element.defaultValue = String(channelLevel)
  }

  /**
   * Emit a pan patch with the new clamped pan, then write the controlled value
   * back as React restores a controlled input.
   * @param event - The range input's native input event.
   */
  function handlePan(event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    onChange?.({ id: channel.id, pan: clampPan(parseFloat(element.value)) })
    element.value = String(channelPan)
    element.defaultValue = String(channelPan)
  }

  /**
   * Toggle mute and emit a patch.
   * @param event - The button click event.
   */
  function handleMute(event: MouseEvent): void {
    event.preventDefault()
    onChange?.({ id: channel.id, muted: !channel.muted })
  }

  /**
   * Toggle solo and emit a patch.
   * @param event - The button click event.
   */
  function handleSolo(event: MouseEvent): void {
    event.preventDefault()
    onChange?.({ id: channel.id, solo: !channel.solo })
  }

  /**
   * Emit a send patch for the send that moved, then write its controlled value
   * back as React restores a controlled input.
   * @param send - The send that moved.
   * @param event - The range input's native input event.
   */
  function handleSend(send: Send, event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    const level = clampLevel(send.level)
    onChange?.({
      id: channel.id,
      sendId: send.id,
      sendLevel: clampLevel(parseFloat(element.value)),
    })
    element.value = String(level)
    element.defaultValue = String(level)
  }
</script>

<div
  role="group"
  aria-label={channel.name}
  data-mol-id={isMaster ? 'audio-mixer-master-strip' : 'audio-mixer-channel-strip'}
  data-channel-id={channel.id}
  data-muted={channel.muted ? 'true' : 'false'}
  data-solo={channel.solo ? 'true' : 'false'}
  class={cm.cn()}
  style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 96px; padding: 8px; box-sizing: border-box"
>
  <div
    data-mol-id="audio-mixer-channel-name"
    style="width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
    use:reactStyle={{ borderTop: channel.color ? `3px solid ${channel.color}` : undefined }}
    style:padding-top={channel.color ? '4px' : '0px'}
  >
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{channel.name}</span>
  </div>
  <div
    style="height: {faderHeight}px; width: 32px; display: flex; align-items: center; justify-content: center"
  >
    <input
      type="range"
      min={MIN_LEVEL}
      max={MAX_LEVEL}
      step={0.01}
      use:rangeValue={channelLevel}
      aria-label={faderAria}
      aria-valuemin={MIN_LEVEL}
      aria-valuemax={MAX_LEVEL}
      aria-valuenow={channelLevel}
      aria-orientation="vertical"
      data-mol-id={isMaster ? 'audio-mixer-master-fader' : 'audio-mixer-fader'}
      style="width: {faderHeight}px; height: 24px; transform: rotate(-90deg); transform-origin: center"
      oninput={handleFader}
    />
  </div>
  <input
    type="range"
    min={MIN_PAN}
    max={MAX_PAN}
    step={0.01}
    use:rangeValue={channelPan}
    aria-label={panAria}
    aria-valuemin={MIN_PAN}
    aria-valuemax={MAX_PAN}
    aria-valuenow={channelPan}
    data-mol-id="audio-mixer-pan"
    style="width: 64px"
    oninput={handlePan}
  />
  <div data-mol-id="audio-mixer-buttons" style="display: flex; gap: 4px">
    <button
      type="button"
      aria-label={muteLabel}
      aria-pressed={channel.muted ? 'true' : 'false'}
      data-mol-id="audio-mixer-mute"
      class={toggleClass(channel.muted === true)}
      onclick={handleMute}
    >
      {muteInitial}
    </button>
    <button
      type="button"
      aria-label={soloLabel}
      aria-pressed={channel.solo ? 'true' : 'false'}
      data-mol-id="audio-mixer-solo"
      class={toggleClass(channel.solo === true)}
      onclick={handleSolo}
    >
      {soloInitial}
    </button>
  </div>
  {#if !isMaster && channel.sends !== undefined && channel.sends.length > 0}
    <div
      data-mol-id="audio-mixer-sends"
      style="display: flex; flex-direction: column; gap: 4px; width: 100%; padding-top: 4px; border-top: 1px solid"
    >
      <span class={cm.cn(cm.textSize('xs'))} style="opacity: 0.7; text-align: center">
        {sendsLabel}
      </span>
      {#each channel.sends as send (send.id)}
        <div
          data-mol-id="audio-mixer-send"
          data-send-id={send.id}
          style="display: flex; align-items: center; gap: 4px"
        >
          <span
            class={cm.cn(cm.textSize('xs'))}
            style="flex: 0 0 32px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          >
            {send.label ?? send.id}
          </span>
          <input
            type="range"
            min={MIN_LEVEL}
            max={MAX_LEVEL}
            step={0.01}
            use:rangeValue={clampLevel(send.level)}
            aria-label={sendAria(send.label ?? send.id)}
            aria-valuemin={MIN_LEVEL}
            aria-valuemax={MAX_LEVEL}
            aria-valuenow={clampLevel(send.level)}
            data-mol-id="audio-mixer-send-fader"
            style="flex: 1 1 0%"
            oninput={(event) => handleSend(send, event)}
          />
        </div>
      {/each}
    </div>
  {/if}
</div>
