/**
 * The effort picker popup — React's render section "Effort picker popup": the
 * `/effort` command's selectable per-mode level list.
 *
 * It mirrors the model picker's shell (a header with a mode dropdown that
 * re-scopes the open picker in place) with the sounds picker's simple row list.
 * Levels are the selected mode's model's OWN native values (`xhigh` on Claude,
 * 16K thinking tokens on budget-scaled models); a fixed-reasoning model lists
 * nothing and says so instead. Owned by U11, nested inside the input area.
 *
 * @module
 */

import { h, type VNode, type VNodeChild } from 'vue'

import { defaultEffortForModel, type EffortMode } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx } from './context.js'

/**
 * Renders the effort picker.
 *
 * @param ctx - The panel context (the open picker, its scoped model, its rows
 *   and the live viewport flags).
 * @returns The picker, or `null` while it is closed.
 */
export function renderChatEffortPicker(ctx: ChatCtx): VNodeChild {
  const effortPicker = ctx.composer.effortPicker.value
  if (!effortPicker) return null
  const cm = ctx.env.cm
  const t = ctx.env.t
  const isCoarse = ctx.env.isCoarse.value
  const effortPickerModel = ctx.pickers.effortPickerModel.value
  const effortPickerOptions = ctx.pickers.effortPickerOptions.value
  const effortPickerVisible = ctx.pickers.effortPickerVisible.value
  const effortPickerCurrent = ctx.pickers.effortPickerCurrent.value
  const effortPickerModeOptions = ctx.pickers.effortPickerModeOptions.value
  const modeLabel = t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })

  return h(
    'div',
    {
      class: cm.cn(cm.surface, cm.borderAll),
      style: {
        position: 'absolute',
        bottom: '100%',
        left: '0px',
        right: '0px',
        marginBottom: '0px',
        borderRadius: '6px 6px 0 0',
        zIndex: '100',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: ctx.env.popupMaxHeight.value,
      },
    },
    [
      h(
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
          h('span', { style: { flexShrink: '0' } }, [
            t('ide.chat.settings.effort.label', undefined, {
              defaultValue: 'Reasoning effort',
            }),
          ]),
          // Mode dropdown — re-scopes the OPEN picker in place; each option
          // names the model that mode actually runs, since the listed levels
          // are that model's own.
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
                  'data-mol-id': 'chat-effort-mode-select',
                  'aria-label': modeLabel,
                  onChange: (event: Event) => {
                    const v = (event.target as HTMLSelectElement).value
                    // Reset the highlighted row — the level list changes with
                    // the mode's model.
                    ctx.composer.setEffortPicker((p) =>
                      p ? { ...p, mode: v as EffortMode, selectedIdx: -1 } : p,
                    )
                  },
                  class: cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs')),
                  style: {
                    borderRadius: '4px',
                    // Extra right padding clears the native dropdown arrow so
                    // the selected label never runs underneath it.
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
                    if (el) el.value = effortPicker.mode
                  },
                  onVnodeUpdated: (vnode: VNode) => {
                    const el = vnode.el as HTMLSelectElement | null
                    if (el) el.value = effortPicker.mode
                  },
                },
                effortPickerModeOptions.map((o) =>
                  h('option', { key: o.value, value: o.value }, [o.label]),
                ),
              ),
            ],
          ),
          h(
            'button',
            {
              // mol-bespoke-button: icon-only picker close — header x, no label
              type: 'button',
              'data-mol-id': 'chat-effort-picker-close',
              onClick: () => ctx.composer.setEffortPicker(null),
              style: {
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0 2px',
                fontSize: '14px',
                lineHeight: '1',
                opacity: '0.6',
                // Touch floor for this secondary header ✕ (36px, like the
                // notice-card actions); fine pointers keep the slim header.
                ...(isCoarse
                  ? {
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '36px',
                      minHeight: '36px',
                    }
                  : {}),
              },
            },
            ['✕'],
          ),
        ],
      ),
      h('div', { style: { overflowY: 'auto', flex: '1' } }, [
        effortPickerOptions.length === 0
          ? h(
              'div',
              { class: cm.cn(cm.textSize('sm'), cm.textMuted), style: { padding: '12px' } },
              [
                t(
                  'ide.chat.effort.fixedForModel',
                  { mode: effortPicker.mode, model: effortPickerModel?.label ?? '?' },
                  {
                    defaultValue:
                      'Reasoning effort is fixed on {{model}} ({{mode}} mode) — nothing to set.',
                  },
                ),
              ],
            )
          : effortPickerVisible.map((option, idx) =>
              h(
                'button',
                {
                  // mol-bespoke-button: effort level row — full-width list item in the /effort popup
                  key: option.value,
                  type: 'button',
                  'data-mol-id': `chat-effort-level-${option.value}`,
                  onClick: () => {
                    void ctx.modelActions.applyEffortLevel(
                      effortPicker.mode,
                      option.value,
                      effortPickerModel,
                    )
                  },
                  onMouseenter: (event: MouseEvent) => {
                    const el = event.currentTarget
                    if (el instanceof HTMLElement) el.style.background = 'rgba(128,128,128,0.15)'
                  },
                  onMouseleave: (event: MouseEvent) => {
                    const el = event.currentTarget
                    if (el instanceof HTMLElement)
                      el.style.background =
                        idx === effortPicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
                  },
                  class: cm.w('full'),
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    minHeight: '40px',
                    padding: '8px 12px',
                    border: 'none',
                    borderTop: idx === 0 ? 'none' : '1px solid rgba(128,128,128,0.12)',
                    cursor: 'pointer',
                    color: 'inherit',
                    textAlign: 'left',
                    fontSize: '13px',
                    background:
                      idx === effortPicker.selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
                  },
                },
                [
                  h('span', { class: cm.fontWeight('medium') }, [option.value]),
                  defaultEffortForModel(effortPickerModel) === option.value
                    ? h('span', { class: cm.textMuted, style: { fontSize: '10px' } }, [
                        t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' }),
                      ])
                    : null,
                  effortPickerCurrent === option.value
                    ? h(
                        'span',
                        {
                          'data-mol-id': `effort-current-${option.value}`,
                          class: cm.fontWeight('medium'),
                          style: {
                            // Right-aligned + primary-tinted, matching the model
                            // picker's "current" pill (hex is only the var()
                            // fallback; the theme token wins).
                            marginLeft: 'auto',
                            fontSize: '10px',
                            color: 'var(--mol-color-primary, #6366f1)',
                            background:
                              'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
                            border:
                              '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
                            padding: '1px 7px',
                            borderRadius: '999px',
                          },
                        },
                        [t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })],
                      )
                    : null,
                ],
              ),
            ),
      ]),
    ],
  )
}
