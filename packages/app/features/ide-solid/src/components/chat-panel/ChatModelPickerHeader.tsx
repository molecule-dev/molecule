/**
 * The model picker's header — React's render section "Picker header — Mode +
 * Sort controls".
 *
 * A Mode dropdown re-scopes the OPEN picker in place (each option names the
 * model that mode currently resolves to; picking a mode clears the highlighted
 * row because the lock rules change with it) and a Sort control orders the rows,
 * with a square direction toggle beside it. Every control is 24px tall, each
 * label+control group grows so the two selects split the row proportionally, and
 * the header wraps on a narrow pane.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, For } from 'solid-js'

import type { ModelMode, ModelSortColumn } from '@molecule/app-ide-panel-logic/panels'
import { Tooltip } from '@molecule/app-ui-solid'

import { Icon } from '../Icon.jsx'
import type { ChatInnerCtx } from './context.js'

/**
 * Applies a controlled select's wanted value AFTER its options exist (React
 * applies it in the commit): marks the matching option selected, and — like
 * React's `updateOptions` — leaves the select alone when nothing matches, so it
 * keeps the browser's own first-option selection.
 *
 * @param el - The select element.
 * @param wanted - The wanted value.
 */
function applySelectValue(el: HTMLSelectElement, wanted: string): void {
  for (const option of Array.from(el.options)) {
    if (option.value === wanted) {
      option.selected = true
      return
    }
  }
}

/** Props for {@link ChatModelPickerHeader}. */
export interface ChatModelPickerHeaderProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the model picker's header.
 * @param props - The inner ctx (the open picker, the mode options and the sort state).
 * @returns The header, or `null` when no picker is open.
 */
export function ChatModelPickerHeader(props: ChatModelPickerHeaderProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env
  let modeSelect: HTMLSelectElement | undefined
  let sortSelect: HTMLSelectElement | undefined

  // React writes these selects' `value` as a live property after the options
  // mount; the ref effects reproduce that timing (and write no attribute).
  createEffect(() => {
    // The options too: their labels carry the model names, so the list is rebuilt (new option
    // elements, the select back on its first) whenever the models load or change, and React's
    // controlled value is applied again on that render.
    ctx.pickers.pickerModeOptions()
    const picker = ctx.composer.modelPicker()
    if (modeSelect) applySelectValue(modeSelect, picker?.mode ?? '')
  })
  createEffect(() => {
    if (sortSelect) applySelectValue(sortSelect, ctx.pickers.modelSort().column)
  })

  return (
    <div
      class={cm.cn(cm.textSize('xs'), cm.textMuted)}
      style={{
        padding: '6px 12px',
        'border-bottom': '1px solid rgba(128,128,128,0.12)',
        display: 'flex',
        'align-items': 'center',
        gap: '10px',
        'flex-shrink': '0',
        'flex-wrap': 'wrap',
      }}
    >
      {/* Mode dropdown — re-scopes the OPEN picker in place. Wider flex-basis
          than Sort because its option labels carry model names. */}
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '6px',
          flex: '1 1 190px',
          'min-width': '0px',
        }}
      >
        <span style={{ 'flex-shrink': '0' }}>
          {t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
        </span>
        <select
          ref={(node: HTMLSelectElement) => {
            modeSelect = node
          }}
          data-mol-id="chat-model-mode-select"
          aria-label={t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
          onChange={(event) => {
            const v = event.currentTarget.value
            // Reset the highlighted row — the lock rules (and thus which rows
            // are selectable) change with the mode.
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
          class={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
          style={{
            'border-radius': '4px',
            // Extra right padding clears the native dropdown arrow so the
            // selected label never runs underneath it.
            padding: '2px 18px 2px 6px',
            color: 'inherit',
            cursor: 'pointer',
            height: '24px',
            'box-sizing': 'border-box',
            // Fill the group; min-width 0 lets the select shrink below its
            // option text, and ellipsis (honored by Chromium for selects) trims
            // a long mode label gracefully instead of hard-clipping mid-glyph.
            flex: '1',
            'min-width': '0px',
            overflow: 'hidden',
            'white-space': 'nowrap',
            'text-overflow': 'ellipsis',
          }}
        >
          <For each={ctx.pickers.pickerModeOptions()}>
            {(o) => <option value={o.value}>{o.label}</option>}
          </For>
        </select>
      </div>
      {/* Sort control (the active model is shown by the right-aligned per-row
          "current" pill below). Reuses the removed `/models` table's
          sortModels helper. */}
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '6px',
          flex: '1 1 150px',
          'min-width': '0px',
        }}
      >
        <span style={{ 'flex-shrink': '0' }}>
          {t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}
        </span>
        <select
          ref={(node: HTMLSelectElement) => {
            sortSelect = node
          }}
          data-mol-id="model-sort-column"
          aria-label={t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })}
          onChange={(event) =>
            ctx.pickers.setModelSort((s) => ({
              ...s,
              column: event.currentTarget.value as ModelSortColumn,
            }))
          }
          class={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
          style={{
            'border-radius': '4px',
            // Extra right padding clears the native dropdown arrow so the
            // selected label never runs underneath it.
            padding: '2px 18px 2px 6px',
            color: 'inherit',
            cursor: 'pointer',
            height: '24px',
            'box-sizing': 'border-box',
            flex: '1',
            'min-width': '0px',
            overflow: 'hidden',
            'white-space': 'nowrap',
            'text-overflow': 'ellipsis',
          }}
        >
          <option value="name">
            {t('ide.chat.models.colName', undefined, { defaultValue: 'Model' })}
          </option>
          <option value="context">
            {t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' })}
          </option>
          <option value="cost">
            {t('ide.chat.models.colUsageRate', undefined, { defaultValue: 'Usage rate' })}
          </option>
          <option value="cutoff">
            {t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' })}
          </option>
          <option value="free">
            {t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' })}
          </option>
          <option value="region">
            {t('ide.chat.models.colRegion', undefined, { defaultValue: 'Region' })}
          </option>
        </select>
        <Tooltip
          content={t('ide.chat.modelSortDirection', undefined, {
            defaultValue: 'Toggle sort direction',
          })}
          placement="top"
        >
          <button
            /* mol-bespoke-button: icon-only sort-direction toggle — 24px square matched to the adjacent selects' height */
            type="button"
            data-mol-id="model-sort-direction"
            aria-label={t('ide.chat.modelSortDirection', undefined, {
              defaultValue: 'Toggle sort direction',
            })}
            onClick={() =>
              ctx.pickers.setModelSort((s) => ({
                ...s,
                direction: s.direction === 'asc' ? 'desc' : 'asc',
              }))
            }
            class={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textMuted)}
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              'border-radius': '4px',
              padding: '0px',
              color: 'inherit',
              cursor: 'pointer',
              // Square button matching the selects' 24px height exactly.
              height: '24px',
              width: '24px',
              'flex-shrink': '0',
              'box-sizing': 'border-box',
            }}
          >
            <Icon
              name={ctx.pickers.modelSort().direction === 'asc' ? 'chevron-up' : 'chevron-down'}
              size={12}
              aria-hidden="true"
              data-mol-id="model-sort-direction-glyph"
            />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
