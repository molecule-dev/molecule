<!--
  The model picker's rows and processing-region dropdown — React's render
  section "minWidth:0 + ellipsis so a long label yields to the…": the rows the
  `/model` picker lists (with the inline "Older models" disclosure), each row's
  provider, current/Pro/free-in pill, description, context/out/usage/peak/cutoff
  details and capability badges, and the fixed-position menu of a model's
  available processing regions.

  The row and its region control are SIBLINGS inside a positioning wrapper: the
  pill is a control, and a control cannot sit inside the row button (axe
  `nested-interactive`), so it overlays the row's bottom-right from the wrapper
  instead. Every row's pre-render data (badges, lock reason, rate, region pill)
  comes from the framework-neutral `modelPickerRowView`; nothing here re-derives
  it.

  View only: the open picker, the catalog, the row lists, the sort and the region
  menu come from the slices through `ctx`.
-->
<script lang="ts">
  import type { AppModelDefinition } from '@molecule/app-ai-models'
  import { formatTokenCount } from '@molecule/app-ai-models'
  import type { ModelPickerRowView } from '@molecule/app-ide-panel-logic/panels'
  import {
    MODEL_REGION_FLAGS,
    modelHasPeakPricing,
    modelPeakWindowLabels,
    modelPickerRowView,
    modelRegionLabel,
    modelUsageRate,
  } from '@molecule/app-ide-panel-logic/panels'
  import { Tooltip } from '@molecule/app-ui-svelte'

  import { styleText } from '../../parts/inline-style.js'
  import Icon from '../Icon.svelte'
  import type { ChatContext } from './context.svelte.js'
  import RegionFlag from './RegionFlag.svelte'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

{#snippet regionTrigger(model: AppModelDefinition, row: ModelPickerRowView, menuOpen: boolean)}
  <!-- The trigger is built once so the Tooltip wrap can be dropped while the
       menu is open (the menu replaces it — stacking a hover tooltip on an open
       menu is noise). The role and tabindex are conditional (only a changeable
       region is interactive), which the a11y check cannot see. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <span
    role={row.regionPill.interactive ? 'button' : undefined}
    tabindex={row.regionPill.interactive ? 0 : undefined}
    aria-label={row.regionPill.hint}
    aria-haspopup={row.regionPill.interactive ? 'menu' : undefined}
    aria-expanded={row.regionPill.interactive ? menuOpen : undefined}
    data-mol-id={`model-region-${model.id}`}
    onclick={(event) => {
      event.stopPropagation()
      if (!row.regionPill.interactive) return
      ctx.pickers.toggleRegionMenu(model.id, event.currentTarget)
    }}
    onkeydown={(event) => {
      if (!row.regionPill.interactive) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.stopPropagation()
        event.preventDefault()
        ctx.pickers.toggleRegionMenu(model.id, event.currentTarget)
      } else if (event.key === 'Escape' && menuOpen) {
        event.stopPropagation()
        ctx.pickers.setRegionMenu(null)
      }
    }}
    onmouseenter={(event) => {
      // Hover affordance beyond the tooltip (same imperative idiom as the row
      // button's own hover background).
      if (row.regionPill.interactive) {
        event.currentTarget.style.background = 'rgba(128,128,128,0.25)'
      }
    }}
    onmouseleave={(event) => {
      event.currentTarget.style.background = menuOpen ? 'rgba(128,128,128,0.25)' : 'transparent'
    }}
    use:styleText={`display: inline-flex; align-items: center; gap: 4px; padding: 1px 4px; border-radius: 4px; background: ${
      menuOpen ? 'rgba(128,128,128,0.25)' : 'transparent'
    }; cursor: ${row.regionPill.interactive ? 'pointer' : 'default'}`}
  >
    {#if row.regionPill.interactive}
      <Icon name="chevron-down" size={10} aria-hidden="true" className={ctx.env.cm.textMuted} />
    {/if}
    <span class={ctx.env.cm.textMuted} style="font-size: 10px; line-height: 14px">
      {row.regionPill.label}
    </span>
    <!-- Rectangular flag from the bonded flag set, sized to the capability
         pills' 14px height. -->
    <RegionFlag
      code={MODEL_REGION_FLAGS[row.regionPill.region] ?? row.regionPill.region}
      height={14}
    />
  </span>
{/snippet}

{#if ctx.composer.modelPicker}
  {@const picker = ctx.composer.modelPicker}
  {#if ctx.models.modelsLoading}
    <div
      class={ctx.env.cm.cn(ctx.env.cm.textSize('sm'), ctx.env.cm.textMuted)}
      style="padding: 12px"
    >
      {ctx.env.t('ide.chat.modelsLoading', undefined, { defaultValue: 'Loading models…' })}
    </div>
  {:else}
    <div style="overflow-y: auto; flex: 1">
      {#each ctx.pickers.visibleModels as model, idx (model.id)}
        {@const isDeprecatedRow = idx >= ctx.pickers.currentModels.length}
        {@const dividerBefore =
          idx === ctx.pickers.currentModels.length && ctx.pickers.deprecatedModels.length > 0}
        {@const row = modelPickerRowView({
          model,
          isLight: ctx.env.isLight,
          isFreeTier: ctx.models.isFreeTier,
          mode: picker.mode,
          models: ctx.models.AVAILABLE_MODELS,
          serverDefaults: ctx.models.serverModelDefaults,
          freeTierModel: ctx.models.FREE_TIER_MODEL,
          modelRegion: ctx.pickers.effectiveModelRegion(model),
          t: ctx.env.t,
        })}
        {@const regionMenu = ctx.pickers.regionMenu}
        {@const menuOpen = regionMenu?.modelId === model.id}
        {@const hasPeak = !row.isCustom && modelHasPeakPricing(model, row.modelRegion)}
        {@const peakSeparator = ' · '}
        {@const peakStyle =
          row.peakNow > 1 ? `color: ${row.priceColor}; opacity: 1` : 'opacity: 0.8'}
        {#if dividerBefore}
          <button
            type="button"
            onclick={() => ctx.pickers.setShowDeprecated((s) => !s)}
            class={ctx.env.cm.cn(
              ctx.env.cm.textSize('xs'),
              ctx.env.cm.textMuted,
              ctx.env.cm.w('full'),
            )}
            style="padding: 6px 12px; border: none; border-top: 1px solid rgba(128,128,128,0.12); background: rgba(128,128,128,0.04); cursor: pointer; text-align: left"
          >
            {ctx.env.t(
              'ide.chat.olderModelsCollapse',
              { count: ctx.pickers.deprecatedModels.length },
              { defaultValue: 'Older models ⌃ ({{count}})' },
            )}
          </button>
        {/if}
        <div style="position: relative">
          <button
            type="button"
            onclick={() => {
              // Read the row before closing the picker: `row` and `picker` are `{@const}`s of this
              // `{#if}`, and once `setModelPicker(null)` runs they recompute against a null picker.
              const { lockReason, usableMode } = row
              const mode = picker.mode
              if (lockReason === 'paid') {
                ctx.composer.setModelPicker(null)
                ctx.renderHandlers.stableSetInputValue('')
                ctx.renderHandlers.stableAddSystemCard(
                  ctx.env.t(
                    'ide.chat.modelUpgradeRequired',
                    { model: model.label },
                    {
                      defaultValue: '{{model}} is available on Pro. Upgrade to access all models.',
                    },
                  ),
                  // Host owns the upgrade/sign-in button(s) (its routes/copy).
                  { action: ctx.props.buildUpgradeCta?.({}) ?? undefined },
                )
              } else if (lockReason === 'mode') {
                // Free-usable in a DIFFERENT mode — a plain one-liner, never
                // the paid-upgrade pitch.
                ctx.composer.setModelPicker(null)
                ctx.renderHandlers.stableSetInputValue('')
                ctx.renderHandlers.stableAddSystemCard(
                  usableMode === 'plan'
                    ? ctx.env.t('ide.chat.modeOnlyPlan', undefined, {
                        defaultValue: 'On the free plan, this model is used in plan mode.',
                      })
                    : usableMode === 'execute'
                      ? ctx.env.t('ide.chat.modeOnlyExecute', undefined, {
                          defaultValue: 'On the free plan, this model is used in execute mode.',
                        })
                      : ctx.env.t('ide.chat.modeOnlyCommit', undefined, {
                          defaultValue:
                            'On the free plan, this model is used for commit messages and compaction.',
                        }),
                )
              } else {
                void ctx.renderHandlers.stableSelectModel(model.id, model.label, mode)
              }
            }}
            onmouseenter={(event) => {
              if (!row.locked) event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
            }}
            onmouseleave={(event) => {
              event.currentTarget.style.background =
                idx === picker.selectedIdx && !row.locked ? 'rgba(128,128,128,0.1)' : 'transparent'
            }}
            class={ctx.env.cm.cn(ctx.env.cm.w('full'), ctx.env.cm.accentCard({ tone: 'custom' }))}
            style="--mol-accent: {row.accent}; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px 8px 30px; border: none; border-top: 1px solid rgba(128,128,128,0.12); cursor: {row.locked
              ? 'default'
              : 'pointer'}; color: inherit; text-align: left; font-size: 13px; opacity: {row.locked
              ? 0.45
              : isDeprecatedRow
                ? 0.7
                : 1}; background: {idx === picker.selectedIdx && !row.locked
              ? 'rgba(128,128,128,0.1)'
              : 'transparent'}"
          >
            <div style="display: flex; align-items: center; gap: 6px; width: 100%">
              <!-- minWidth:0 + ellipsis so a long label yields to the
                   right-aligned current/lock pill instead of pushing it past a
                   narrow (390px) pane's edge. -->
              <span
                class={ctx.env.cm.fontWeight('medium')}
                style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
              >
                {model.label}
              </span>
              <span style="font-size: 10px; color: {row.accent}; opacity: 0.85; flex-shrink: 0">
                {model.provider}
              </span>
              {#if model.id === ctx.pickers.currentPickerModelId}
                <span
                  data-mol-id={`model-current-${model.id}`}
                  class={ctx.env.cm.fontWeight('medium')}
                  style="margin-left: auto; font-size: 10px; color: var(--mol-color-primary, #6366f1); background: color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent); border: 1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent); padding: 1px 7px; border-radius: 999px"
                >
                  {ctx.env.t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
                </span>
              {/if}
              {#if row.lockReason === 'paid'}
                <span
                  style="font-size: 10px; margin-left: auto; background: rgba(128,128,128,0.2); padding: 1px 5px; border-radius: 3px"
                >
                  {ctx.env.t('ide.chat.proRequired', undefined, { defaultValue: 'Pro' })}
                </span>
              {/if}
              <!-- Free-tier model locked here only because it belongs to a
                   DIFFERENT mode — a muted "free in <mode>" pill, never the
                   paid "Pro" claim. -->
              {#if row.lockReason === 'mode'}
                <span
                  class={ctx.env.cm.textMuted}
                  style="font-size: 10px; margin-left: auto; background: rgba(128,128,128,0.2); padding: 1px 5px; border-radius: 3px"
                >
                  {row.freeInLabel}
                </span>
              {/if}
            </div>
            <span style="font-size: 12px; opacity: 0.7">{model.description}</span>
            <span style="font-size: 11px; opacity: 0.65"
              >{`${formatTokenCount(model.contextWindow)} ctx · ${formatTokenCount(model.maxOutputTokens)} out · `}{#if row.isCustom}<span
                  title={ctx.env.t('ide.chat.models.usageRateYourKeyHint', undefined, {
                    defaultValue: 'Billed to your own provider key, not your plan.',
                  })}
                  >{ctx.env.t('ide.chat.models.usageRateYourKey', undefined, {
                    defaultValue: 'your key',
                  })}</span
                >{:else}<span
                  style="color: {row.priceColor}"
                  title={ctx.env.t('ide.chat.models.usageRateHint', undefined, {
                    defaultValue:
                      'How fast this model uses your AI allowance, relative to the most economical model',
                  })}
                  >{ctx.env.t(
                    'ide.chat.models.usageRateValue',
                    { rate: row.usageRate },
                    { defaultValue: '×{{rate}} usage' },
                  )}</span
                >{/if}{#if hasPeak}{peakSeparator}<span
                  style={peakStyle}
                  title={ctx.env.t(
                    'ide.chat.models.peakHint',
                    {
                      multiplier: model.peakPricing?.multiplier ?? 2,
                      windows: modelPeakWindowLabels(model).join(', '),
                    },
                    {
                      defaultValue:
                        'This model costs ×{{multiplier}} between {{windows}}. It is the normal rate the rest of the day.',
                    },
                  )}
                  >{row.peakNow > 1
                    ? ctx.env.t(
                        'ide.chat.models.peakNow',
                        { multiplier: model.peakPricing?.multiplier ?? 2 },
                        { defaultValue: 'peak ×{{multiplier}} now' },
                      )
                    : ctx.env.t(
                        'ide.chat.models.peakLater',
                        { multiplier: model.peakPricing?.multiplier ?? 2 },
                        { defaultValue: '×{{multiplier}} at peak hours' },
                      )}</span
                >{/if}{#if model.knowledgeCutoff}{` · ${model.knowledgeCutoff}`}{/if}</span
            >
            {#if row.badges.length > 0}
              <span
                style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center; margin-top: 1px; width: 100%"
              >
                {#each row.badges as b (b.label)}
                  <span
                    style="font-size: 10px; color: {b.fg}; background: {b.bg}; padding: 1px 5px; border-radius: 3px"
                  >
                    {b.label}
                  </span>
                {/each}
              </span>
            {/if}
          </button>
          <!-- Processing-region dropdown, anchored to the BOTTOM-RIGHT of the
               row (absolutely positioned against the row wrapper, out of the row
               button itself). Reads right-to-left: bare flag (pill-height, no
               chrome) on the far right, region name to its left, and a
               chevron-down to the left of THAT only when the region is
               changeable — click opens a menu of the model's available regions
               (arbitrary count). Single-region models show name + flag only,
               non-interactive. Rendered as role=button/menu spans, not
               <button>, because the whole model row is itself a <button> and
               nesting buttons is invalid; stopPropagation keeps clicks from
               selecting the row. -->
          {#if row.regionPill.show}
            <span style="position: absolute; right: 12px; bottom: 8px; z-index: 1">
              {#if menuOpen}
                {@render regionTrigger(model, row, true)}
              {:else}
                <Tooltip content={row.regionPill.hint} placement="top">
                  {@render regionTrigger(model, row, false)}
                </Tooltip>
              {/if}
              <!-- The menu opens BELOW the trigger at fixed viewport coords
                   (right edges aligned) so the picker's scroll container can't
                   clip it; scroll/resize close it (see the pickers effect). -->
              {#if menuOpen && regionMenu}
                <span
                  role="menu"
                  aria-label={ctx.env.t('ide.chat.model.regionMenuLabel', undefined, {
                    defaultValue: 'Processing region',
                  })}
                  class={ctx.env.cm.cn(ctx.env.cm.surface, ctx.env.cm.borderAll)}
                  style="position: fixed; top: {regionMenu.top}px; right: {regionMenu.right}px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 130; display: flex; flex-direction: column; min-width: 112px; padding: 2px"
                >
                  {#each row.regionPill.options as r (r)}
                    {@const active = r === row.regionPill.region}
                    <span
                      role="menuitemradio"
                      aria-checked={active}
                      tabindex={0}
                      data-mol-id={`model-region-${model.id}-${r}`}
                      onclick={(event) => {
                        event.stopPropagation()
                        // Read before closing: `active` is a `{@const}` of the menu's `{#if}`.
                        const changed = !active
                        ctx.pickers.setRegionMenu(null)
                        if (changed) void ctx.renderHandlers.stableSetModelRegion(model.id, r)
                      }}
                      onkeydown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.stopPropagation()
                          event.preventDefault()
                          const changed = !active
                          ctx.pickers.setRegionMenu(null)
                          if (changed) void ctx.renderHandlers.stableSetModelRegion(model.id, r)
                        }
                      }}
                      onmouseenter={(event) => {
                        if (!active) event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                      }}
                      onmouseleave={(event) => {
                        event.currentTarget.style.background = active
                          ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                          : 'transparent'
                      }}
                      class={active ? ctx.env.cm.fontWeight('medium') : undefined}
                      use:styleText={`display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; cursor: ${
                        active ? 'default' : 'pointer'
                      }; font-size: 11px; white-space: nowrap; background: ${
                        active
                          ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)'
                          : 'transparent'
                      }; color: ${active ? 'var(--mol-color-primary, #6366f1)' : 'inherit'}`}
                    >
                      <RegionFlag code={MODEL_REGION_FLAGS[r] ?? r} height={12} />
                      <span>{modelRegionLabel(ctx.env.t, r)}</span>
                      <span
                        class={active ? undefined : ctx.env.cm.textMuted}
                        style="font-size: 10px"
                      >
                        ({ctx.env.t(
                          'ide.chat.models.usageRateMultiplier',
                          { rate: modelUsageRate(model, ctx.models.AVAILABLE_MODELS, r) },
                          { defaultValue: '×{{rate}}' },
                        )})
                      </span>
                    </span>
                  {/each}
                </span>
              {/if}
            </span>
          {/if}
        </div>
      {/each}
      {#if !ctx.pickers.showDeprecated && ctx.pickers.deprecatedModels.length > 0}
        <button
          type="button"
          onclick={() => ctx.pickers.setShowDeprecated(true)}
          class={ctx.env.cm.cn(
            ctx.env.cm.textSize('xs'),
            ctx.env.cm.textMuted,
            ctx.env.cm.w('full'),
          )}
          style="padding: 6px 12px; border: none; border-top: 1px solid rgba(128,128,128,0.12); background: rgba(128,128,128,0.04); cursor: pointer; text-align: left"
        >
          {ctx.env.t(
            'ide.chat.olderModelsExpand',
            { count: ctx.pickers.deprecatedModels.length },
            { defaultValue: 'Older models ⌄ ({{count}})' },
          )}
        </button>
      {/if}
    </div>
  {/if}
{/if}
