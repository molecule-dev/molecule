/**
 * The model picker's header — React's render section "Picker header — Mode +
 * Sort controls". A Mode dropdown re-scopes the OPEN picker in place (each
 * option names the model that mode currently resolves to) and a Sort control
 * orders the rows, with a square direction toggle beside it.
 *
 * Every control is 24px tall, each label+control group grows so the two selects
 * split the row proportionally, and the header wraps on a narrow pane.
 *
 * @module
 */

import { h, type VNode, type VNodeChild } from 'vue'

import type { ModelMode, ModelSortColumn } from '@molecule/app-ide-panel-logic/panels'
import { Tooltip } from '@molecule/app-ui-vue'

import { Icon } from '../Icon.js'
import type { ChatCtx } from './context.js'

/**
 * Renders the model picker's header.
 *
 * @param ctx - The panel context (the open picker, the mode options and the sort state).
 * @returns The header, or `null` when no picker is open.
 */
export function renderChatModelPickerHeader(ctx: ChatCtx): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  const modelPicker = ctx.composer.modelPicker.value
  if (!modelPicker) return null
  const modeLabel = t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })
  const sortLabel = t('ide.chat.modelSortLabel', undefined, { defaultValue: 'Sort' })

  return h(
    'div',
    {
      class: cm.cn(cm.textSize('xs'), cm.textMuted),
      style: {
        padding: '6px 12px',
        borderBottom: '1px solid rgba(128,128,128,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: '0',
        flexWrap: 'wrap',
      },
    },
    [
      // Mode dropdown — re-scopes the OPEN picker in place. Wider flex-basis
      // than Sort because its option labels carry model names.
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flex: '1 1 190px',
            minWidth: '0',
          },
        },
        [
          h('span', { style: { flexShrink: '0' } }, [modeLabel]),
          h(
            'select',
            {
              'data-mol-id': 'chat-model-mode-select',
              'aria-label': modeLabel,
              onChange: (event: Event) => {
                const v = (event.target as HTMLSelectElement).value
                // Reset the highlighted row — the lock rules (and thus which
                // rows are selectable) change with the mode.
                ctx.composer.setModelPicker((m) =>
                  m
                    ? {
                        ...m,
                        mode: v === '' ? undefined : (v as ModelMode),
                        selectedIdx: -1,
                      }
                    : m,
                )
              },
              class: cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs')),
              style: {
                borderRadius: '4px',
                // Extra right padding clears the native dropdown arrow so the
                // selected label never runs underneath it.
                padding: '2px 18px 2px 6px',
                color: 'inherit',
                cursor: 'pointer',
                height: '24px',
                boxSizing: 'border-box',
                flex: '1',
                minWidth: '0',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              },
              // React sets the select's `value` as a live property and no
              // attribute; Vue's `value` prop would write both.
              onVnodeMounted: (vnode: VNode) => {
                const el = vnode.el as HTMLSelectElement | null
                if (el) el.value = modelPicker.mode ?? ''
              },
              onVnodeUpdated: (vnode: VNode) => {
                const el = vnode.el as HTMLSelectElement | null
                if (el) el.value = modelPicker.mode ?? ''
              },
            },
            ctx.pickers.pickerModeOptions.value.map((o) =>
              h('option', { key: o.value, value: o.value }, [o.label]),
            ),
          ),
        ],
      ),
      // Sort control (the active model is shown by each row's "current" pill).
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flex: '1 1 150px',
            minWidth: '0',
          },
        },
        [
          h('span', { style: { flexShrink: '0' } }, [sortLabel]),
          h(
            'select',
            {
              'data-mol-id': 'model-sort-column',
              'aria-label': sortLabel,
              onChange: (event: Event) => {
                const column = (event.target as HTMLSelectElement).value as ModelSortColumn
                ctx.pickers.setModelSort((s) => ({ ...s, column }))
              },
              class: cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs')),
              style: {
                borderRadius: '4px',
                // Extra right padding clears the native dropdown arrow so the
                // selected label never runs underneath it.
                padding: '2px 18px 2px 6px',
                color: 'inherit',
                cursor: 'pointer',
                height: '24px',
                boxSizing: 'border-box',
                flex: '1',
                minWidth: '0',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              },
              onVnodeMounted: (vnode: VNode) => {
                const el = vnode.el as HTMLSelectElement | null
                if (el) el.value = ctx.pickers.modelSort.value.column
              },
              onVnodeUpdated: (vnode: VNode) => {
                const el = vnode.el as HTMLSelectElement | null
                if (el) el.value = ctx.pickers.modelSort.value.column
              },
            },
            [
              h('option', { value: 'name' }, [
                t('ide.chat.models.colName', undefined, { defaultValue: 'Model' }),
              ]),
              h('option', { value: 'context' }, [
                t('ide.chat.models.colContext', undefined, { defaultValue: 'Context' }),
              ]),
              h('option', { value: 'cost' }, [
                t('ide.chat.models.colUsageRate', undefined, { defaultValue: 'Usage rate' }),
              ]),
              h('option', { value: 'cutoff' }, [
                t('ide.chat.models.colCutoff', undefined, { defaultValue: 'Cutoff' }),
              ]),
              h('option', { value: 'free' }, [
                t('ide.chat.models.colFree', undefined, { defaultValue: 'Free' }),
              ]),
              h('option', { value: 'region' }, [
                t('ide.chat.models.colRegion', undefined, { defaultValue: 'Region' }),
              ]),
            ],
          ),
          h(
            Tooltip,
            {
              content: t('ide.chat.modelSortDirection', undefined, {
                defaultValue: 'Toggle sort direction',
              }),
              placement: 'top',
            },
            () =>
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'model-sort-direction',
                  'aria-label': t('ide.chat.modelSortDirection', undefined, {
                    defaultValue: 'Toggle sort direction',
                  }),
                  onClick: () => {
                    ctx.pickers.setModelSort((s) => ({
                      ...s,
                      direction: s.direction === 'asc' ? 'desc' : 'asc',
                    }))
                  },
                  class: cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textMuted),
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    padding: '0',
                    color: 'inherit',
                    cursor: 'pointer',
                    // Square button matching the selects' 24px height exactly.
                    height: '24px',
                    width: '24px',
                    flexShrink: '0',
                    boxSizing: 'border-box',
                  },
                },
                [
                  h(Icon, {
                    name:
                      ctx.pickers.modelSort.value.direction === 'asc'
                        ? 'chevron-up'
                        : 'chevron-down',
                    size: 12,
                    'aria-hidden': 'true',
                    'data-mol-id': 'model-sort-direction-glyph',
                  }),
                ],
              ),
          ),
        ],
      ),
    ],
  )
}
