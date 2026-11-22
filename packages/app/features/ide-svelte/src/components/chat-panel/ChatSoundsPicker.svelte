<!--
  React's section “Sounds picker popup” (ChatPanel.tsx lines 7312–7512): the
  `/sounds` picker anchored above the composer. Its header carries the title and
  a close ✕; the body lists an "All" row (the shared mode, or "mixed") above one
  row per stream event, each with its mode badge and one-line description.
  Cycling a row runs through the sounds slice, which persists the per-device
  choice.

  View only: the open picker, the device modes and the cycle action come from the
  slices through `ctx`.
-->
<script lang="ts">
  import {
    SOUND_EVENTS,
    soundEventDescription,
    soundEventLabel,
    soundModeLabel,
  } from '@molecule/app-ide-panel-logic/panels'

  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

{#if ctx.sounds.soundsPicker}
  {@const soundsPicker = ctx.sounds.soundsPicker}
  {@const allModes = SOUND_EVENTS.map((eventType) => ctx.sounds.soundsConfig[eventType])}
  {@const allSame = allModes.every((mode) => mode === allModes[0])}
  {@const currentMode = allSame ? allModes[0] : null}
  {@const allBadge =
    currentMode === 'always'
      ? { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
      : currentMode === 'whenNotFocused'
        ? { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
        : { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }}
  {@const allLabel = allSame
    ? soundModeLabel(ctx.env.t, allModes[0])
    : ctx.env.t('ide.chat.soundMode.mixed', undefined, { defaultValue: 'mixed' })}
  <div
    class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
    style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 0; border-radius: 6px 6px 0 0; z-index: 100; box-shadow: 0 -4px 16px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: {ctx
      .env.popupMaxHeight}"
  >
    <div
      class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
      style="padding: 5px 12px; border-bottom: 1px solid rgba(128,128,128,0.12); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center"
    >
      <span>
        {ctx.env.t('ide.chat.notificationSounds', undefined, {
          defaultValue: 'Notification sounds',
        })}
      </span>
      <!-- The base declarations stay a static style string (so their written
           shorthands survive normalization); the coarse-pointer touch floor is
           applied per property, as React spreads it onto the style object.
           `background` stays last: jsdom's cssText parser drops it when a
           border shorthand follows. -->
      <button
        type="button"
        onclick={() => ctx.sounds.setSoundsPicker(null)}
        style="border: none; cursor: pointer; color: inherit; padding: 0 2px; font-size: 14px; line-height: 1; opacity: 0.6; background: none"
        style:display={ctx.env.isCoarse ? 'inline-flex' : null}
        style:align-items={ctx.env.isCoarse ? 'center' : null}
        style:justify-content={ctx.env.isCoarse ? 'center' : null}
        style:min-width={ctx.env.isCoarse ? '36px' : null}
        style:min-height={ctx.env.isCoarse ? '36px' : null}
      >
        ✕
      </button>
    </div>
    <div style="overflow-y: auto; flex: 1">
      <!-- "All" row -->
      <button
        type="button"
        onclick={() => void ctx.sounds.cycleSoundMode('all')}
        onmouseenter={(event) => {
          event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
        }}
        onmouseleave={(event) => {
          event.currentTarget.style.background =
            soundsPicker?.selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent'
        }}
        class={ctx.env.cm.w('full')}
        style="display: flex; align-items: center; justify-content: space-between; min-height: 55px; padding: 8px 12px; border: none; border-bottom: 1px solid rgba(128,128,128,0.12); cursor: pointer; color: inherit; text-align: left; font-size: 13px"
        style:background={soundsPicker?.selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent'}
      >
        <span class={ctx.env.cm.fontWeight('medium')}>
          {ctx.env.t('ide.chat.soundAll', undefined, { defaultValue: 'All' })}
        </span>
        <span
          style="font-size: 11px; background: {allBadge.bg}; color: {allBadge.fg}; padding: 1px 6px; border-radius: 3px"
        >
          {allLabel}
        </span>
      </button>
      <!-- Per-event rows -->
      {#each SOUND_EVENTS as eventType, idx (eventType)}
        {@const rowIdx = idx + 1}
        {@const mode = ctx.sounds.soundsConfig[eventType]}
        {@const badgeColor =
          mode === 'always'
            ? { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
            : mode === 'whenNotFocused'
              ? { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
              : { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }}
        <button
          type="button"
          onclick={() => void ctx.sounds.cycleSoundMode(eventType)}
          onmouseenter={(event) => {
            event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
          }}
          onmouseleave={(event) => {
            event.currentTarget.style.background =
              soundsPicker?.selectedIdx === rowIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
          }}
          class={ctx.env.cm.w('full')}
          style="display: flex; flex-direction: column; justify-content: center; min-height: 55px; padding: 8px 12px 8px 24px; border: none; border-top: 1px solid rgba(128,128,128,0.12); cursor: pointer; color: inherit; text-align: left; font-size: 13px"
          style:background={soundsPicker?.selectedIdx === rowIdx
            ? 'rgba(128,128,128,0.1)'
            : 'transparent'}
        >
          <div style="display: flex; align-items: center; justify-content: space-between">
            <span>{soundEventLabel(ctx.env.t, eventType)}</span>
            <span
              style="font-size: 11px; background: {badgeColor.bg}; color: {badgeColor.fg}; padding: 1px 6px; border-radius: 3px; flex-shrink: 0"
            >
              {soundModeLabel(ctx.env.t, mode)}
            </span>
          </div>
          <div class={ctx.env.cm.textMuted} style="font-size: 11px; margin-top: 2px; opacity: 0.7">
            {soundEventDescription(ctx.env.t, eventType, { agentName: ctx.agentName })}
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}
