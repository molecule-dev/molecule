<!--
  AudioMixer: the Svelte counterpart of
  `@molecule/app-feature-audio-mixer-react`'s `AudioMixer` — one column per
  channel (name, vertical fader, pan knob, mute/solo, optional sends row) plus
  an optional master column. Same props (React names) and the same DOM for the
  same input; the caller wires the emitted change patches to their audio engine.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ChannelStrip from './ChannelStrip.svelte'
  import type { AudioMixerProps } from './types.js'

  let {
    channels,
    onChannelChange,
    master,
    onMasterChange,
    faderHeight = 180,
    className,
  }: AudioMixerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const consoleLabel = $derived(
    t('audioMixer.aria.console', {}, { defaultValue: 'Audio mixer console' }),
  )
  const masterLabel = $derived(t('audioMixer.master', {}, { defaultValue: 'Master' }))
  const muteLabel = $derived(t('audioMixer.button.mute', {}, { defaultValue: 'Mute' }))
  const soloLabel = $derived(t('audioMixer.button.solo', {}, { defaultValue: 'Solo' }))
  // The compact buttons show one letter; a locale's letter is its own key, not
  // the label's `charAt(0)` — which under a translated label is an arbitrary
  // slice of that string (and under the en-XA pseudo-locale a lone `⟦`).
  const muteInitial = $derived(t('audioMixer.button.muteInitial', {}, { defaultValue: 'M' }))
  const soloInitial = $derived(t('audioMixer.button.soloInitial', {}, { defaultValue: 'S' }))
  const sendsLabel = $derived(t('audioMixer.sends', {}, { defaultValue: 'Sends' }))
</script>

<div
  role="group"
  aria-label={consoleLabel}
  data-mol-id="audio-mixer"
  class={cm.cn(className)}
  style="display: flex; align-items: stretch; gap: 8px; overflow-x: auto; user-select: none"
>
  {#each channels as channel (channel.id)}
    <ChannelStrip
      {channel}
      {faderHeight}
      {muteLabel}
      {soloLabel}
      {muteInitial}
      {soloInitial}
      {sendsLabel}
      labelName={channel.name}
      onChange={onChannelChange}
      isMaster={false}
    />
  {/each}
  {#if master !== undefined}
    <div
      data-mol-id="audio-mixer-divider"
      aria-hidden="true"
      style="width: 1px; align-self: stretch; background: currentcolor; opacity: 0.2; margin: 0px 4px"
    ></div>
    <ChannelStrip
      channel={master}
      {faderHeight}
      {muteLabel}
      {soloLabel}
      {muteInitial}
      {soloInitial}
      {sendsLabel}
      labelName={master.name || masterLabel}
      onChange={onMasterChange}
      isMaster={true}
    />
  {/if}
</div>
