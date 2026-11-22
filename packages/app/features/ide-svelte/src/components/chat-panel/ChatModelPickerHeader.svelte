<!--
  React's section “Picker header — Mode + Sort controls” (ChatPanel.tsx lines
  6288–6476): the `/model` picker's header row — a Mode dropdown that re-scopes
  the OPEN picker in place, a Sort column dropdown, and a square sort-direction
  toggle.

  Layout rules (the old version was visibly ragged: content-width selects at
  different heights, ragged wrap on narrow panes):
  - every control is exactly 24px tall (boxSizing border-box);
  - each label+control group is a flex item that GROWS, so on one row the two
    selects split the width proportionally and line up edge-to-edge, and when
    the header wraps (~390px pane) each group fills its own row instead of
    leaving a ragged short select;
  - labels never shrink, selects take all remaining group width.

  View only: the open picker, the mode options and the sort come from the
  slices through `ctx`.
-->
<script lang="ts">
  import type { ModelMode, ModelSortColumn } from '@molecule/app-ide-panel-logic/panels'
  import { Tooltip } from '@molecule/app-ui-svelte'

  import Icon from '../Icon.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()
</script>

<div
  class={ctx.env.cm.cn(ctx.env.cm.textSize('xs'), ctx.env.cm.textMuted)}
  style="padding: 6px 12px; border-bottom: 1px solid rgba(128,128,128,0.12); display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap"
>
  <!-- Mode dropdown — re-scopes the OPEN picker in place. Each option shows the
       mode's currently active model. The /model --plan etc. flags merely
       preselect it. Wider flex-basis than Sort because its option labels carry
       model names. -->
  <div style="display: flex; align-items: center; gap: 6px; flex: 1 1 190px; min-width: 0">
    <span style="flex-shrink: 0">
      {ctx.env.t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
    </span>
    <select
      data-mol-id="chat-model-mode-select"
      aria-label={ctx.env.t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
      value={ctx.composer.modelPicker?.mode ?? ''}
      onchange={(event) => {
        const v = event.currentTarget.value
        // Reset the highlighted row — the lock rules (and thus which rows are
        // selectable) change with the mode.
        ctx.composer.setModelPicker((m) =>
          m
            ? {
                ...m,
                mode: v === '' ? undefined : (v as ModelMode),
                selectedIdx: -1,
              }
            : m,
        )
      }}
      class={ctx.env.cm.cn(
        ctx.env.cm.surfaceSecondary,
        ctx.env.cm.borderAll,
        ctx.env.cm.textSize('xs'),
      )}
      style="border-radius: 4px; padding: 2px 18px 2px 6px; color: inherit; cursor: pointer; height: 24px; box-sizing: border-box; flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
    >
      {#each ctx.pickers.pickerModeOptions as o (o.value)}
        <option value={o.value}>{o.label}</option>
      {/each}
    </select>
  </div>
  <!-- Sort control (replaces the old "Current: X" text — the active model is
       now shown by the right-aligned per-row "current" pill below). Reuses the
       removed `/models` table's sortModels helper. -->
  <div style="display: flex; align-items: center; gap: 6px; flex: 1 1 150px; min-width: 0">
    <span style="flex-shrink: 0">
      {ctx.env.t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}
    </span>
    <select
      data-mol-id="model-sort-column"
      aria-label={ctx.env.t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}
      value={ctx.pickers.modelSort.column}
      onchange={(event) => {
        const column = event.currentTarget.value as ModelSortColumn
        ctx.pickers.setModelSort((s) => ({ ...s, column }))
      }}
      class={ctx.env.cm.cn(
        ctx.env.cm.surfaceSecondary,
        ctx.env.cm.borderAll,
        ctx.env.cm.textSize('xs'),
      )}
      style="border-radius: 4px; padding: 2px 18px 2px 6px; color: inherit; cursor: pointer; height: 24px; box-sizing: border-box; flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
    >
      <option value="name">
        {ctx.env.t('ide.chat.models.colName', undefined, { defaultValue: 'Model' })}
      </option>
      <option value="context">
        {ctx.env.t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' })}
      </option>
      <option value="cost">
        {ctx.env.t('ide.chat.models.colUsageRate', undefined, { defaultValue: 'Usage rate' })}
      </option>
      <option value="cutoff">
        {ctx.env.t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' })}
      </option>
      <option value="free">
        {ctx.env.t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' })}
      </option>
      <option value="region">
        {ctx.env.t('ide.chat.models.colRegion', undefined, { defaultValue: 'Region' })}
      </option>
    </select>
    <Tooltip
      content={ctx.env.t('ide.chat.modelSortDirection', undefined, {
        defaultValue: 'Toggle sort direction',
      })}
      placement="top"
    >
      <button
        type="button"
        data-mol-id="model-sort-direction"
        aria-label={ctx.env.t('ide.chat.modelSortDirection', undefined, {
          defaultValue: 'Toggle sort direction',
        })}
        onclick={() => {
          ctx.pickers.setModelSort((s) => ({
            ...s,
            direction: s.direction === 'asc' ? 'desc' : 'asc',
          }))
        }}
        class={ctx.env.cm.cn(
          ctx.env.cm.surfaceSecondary,
          ctx.env.cm.borderAll,
          ctx.env.cm.textMuted,
        )}
        style="display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; padding: 0; color: inherit; cursor: pointer; height: 24px; width: 24px; flex-shrink: 0; box-sizing: border-box"
      >
        <Icon
          name={ctx.pickers.modelSort.direction === 'asc' ? 'chevron-up' : 'chevron-down'}
          size={12}
          aria-hidden="true"
          data-mol-id="model-sort-direction-glyph"
        />
      </button>
    </Tooltip>
  </div>
</div>
