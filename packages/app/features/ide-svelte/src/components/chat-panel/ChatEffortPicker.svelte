<!--
  React's section “Effort picker popup” (ChatPanel.tsx lines 7111–7310): the
  `/effort` picker's selectable per-mode level list, anchored above the composer.
  It mirrors the model picker's shell (a header with a mode dropdown that
  re-scopes the open picker in place) with the sounds picker's simple row list.
  Levels are the selected mode's model's OWN native values; a fixed-reasoning
  model lists nothing and says so instead.

  View only: the open picker, its model, options and current level come from the
  slices through `ctx`; applying a level goes through the model-actions slice.
-->
<script lang="ts">
  import type { EffortMode } from '@molecule/app-ide-panel-logic/panels'
  import { defaultEffortForModel } from '@molecule/app-ide-panel-logic/panels'

  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

{#if ctx.composer.effortPicker}
  {@const effortPicker = ctx.composer.effortPicker}
  <div
    class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
    style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 0; border-radius: 6px 6px 0 0; z-index: 100; box-shadow: 0 -4px 16px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: {ctx
      .env.popupMaxHeight}"
  >
    <div
      class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
      style="padding: 6px 12px; border-bottom: 1px solid rgba(128,128,128,0.12); display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap"
    >
      <span style="flex-shrink: 0">
        {ctx.env.t('ide.chat.settings.effort.label', undefined, {
          defaultValue: 'Reasoning effort',
        })}
      </span>
      <!-- Mode dropdown — re-scopes the OPEN picker in place; each option names
           the model that mode actually runs, since the listed levels are that
           model's own. -->
      <div style="display: flex; align-items: center; gap: 6px; flex: 1 1 190px; min-width: 0">
        <span style="flex-shrink: 0">
          {ctx.env.t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
        </span>
        <select
          data-mol-id="chat-effort-mode-select"
          aria-label={ctx.env.t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
          value={effortPicker?.mode ?? ''}
          onchange={(event) => {
            const mode = event.currentTarget.value as EffortMode
            // Reset the highlighted row — the level list changes with the
            // mode's model.
            ctx.composer.setEffortPicker((picker) =>
              picker ? { ...picker, mode, selectedIdx: -1 } : picker,
            )
          }}
          class={ctx.env.cm.cn(
            ctx.env.cm.surfaceSecondary,
            ctx.env.cm.borderAll,
            ctx.env.cm.textSize('xs'),
          )}
          style="border-radius: 4px; padding: 2px 18px 2px 6px; color: inherit; cursor: pointer; height: 24px; box-sizing: border-box; flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
        >
          {#each ctx.pickers.effortPickerModeOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      <!-- The base declarations stay a static style string (so their written
           shorthands survive normalization); the coarse-pointer touch floor is
           applied per property, as React spreads it onto the style object.
           `background` stays last: jsdom's cssText parser drops it when a
           border shorthand follows. -->
      <button
        type="button"
        data-mol-id="chat-effort-picker-close"
        onclick={() => ctx.composer.setEffortPicker(null)}
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
      {#if ctx.pickers.effortPickerOptions.length === 0}
        <div
          class={ctx.env.cm.cn(ctx.env.cm.textSize('sm'), ctx.env.cm.textMuted)}
          style="padding: 12px"
        >
          {ctx.env.t(
            'ide.chat.effort.fixedForModel',
            { mode: effortPicker?.mode ?? '', model: ctx.pickers.effortPickerModel?.label ?? '?' },
            {
              defaultValue:
                'Reasoning effort is fixed on {{model}} ({{mode}} mode) — nothing to set.',
            },
          )}
        </div>
      {:else}
        {#each ctx.pickers.effortPickerVisible as option, idx (option.value)}
          <button
            type="button"
            data-mol-id={`chat-effort-level-${option.value}`}
            onclick={() =>
              void ctx.modelActions.applyEffortLevel(
                effortPicker.mode,
                option.value,
                ctx.pickers.effortPickerModel,
              )}
            onmouseenter={(event) => {
              event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
            }}
            onmouseleave={(event) => {
              event.currentTarget.style.background =
                idx === effortPicker?.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
            }}
            class={ctx.env.cm.w('full')}
            style="display: flex; align-items: center; gap: 6px; width: 100%; min-height: 40px; padding: 8px 12px; border-style: none; border-width: medium; border-color: currentcolor; border-image: none; cursor: pointer; color: inherit; text-align: left; font-size: 13px"
            style:border-top={idx === 0 ? 'none' : '1px solid rgba(128,128,128,0.12)'}
            style:background={idx === effortPicker?.selectedIdx
              ? 'rgba(128,128,128,0.1)'
              : 'transparent'}
          >
            <span class={ctx.env.cm.fontWeight('medium')}>{option.value}</span>
            {#if defaultEffortForModel(ctx.pickers.effortPickerModel) === option.value}
              <span class={ctx.env.cm.textMuted} style="font-size: 10px">
                {ctx.env.t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' })}
              </span>
            {/if}
            {#if ctx.pickers.effortPickerCurrent === option.value}
              <span
                data-mol-id={`effort-current-${option.value}`}
                class={ctx.env.cm.fontWeight('medium')}
                style="margin-left: auto; font-size: 10px; color: var(--mol-color-primary, #6366f1); background: color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent); border: 1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent); padding: 1px 7px; border-radius: 999px"
              >
                {ctx.env.t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
              </span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}
