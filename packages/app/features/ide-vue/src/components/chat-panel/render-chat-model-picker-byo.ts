/**
 * The host-provided BYO ("bring your own AI") seam — React's render section
 * "Host-provided seam to the BYO", the "Add or manage your own models…" row.
 *
 * It renders only when the host passes `onManageCustomModels`, as an ANCHORED
 * footer action bar OUTSIDE the scrolling list (`flexShrink: 0` in the
 * picker's column layout) so it stays visible at any scroll position. Clicking
 * it closes the picker and hands the host the mode a "Use" should target.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { ChatCtx } from './context.js'

/**
 * Renders the BYO seam.
 *
 * @param ctx - The panel context (the open picker, its highlighted row, the host callback).
 * @returns The seam, or `null` when the host passes no callback or no picker is open.
 */
export function renderChatModelPickerByo(ctx: ChatCtx): VNodeChild {
  const onManageCustomModels = ctx.props.onManageCustomModels
  const modelPicker = ctx.composer.modelPicker.value
  if (!onManageCustomModels || !modelPicker) return null
  const cm = ctx.env.cm
  const t = ctx.env.t
  const visibleCount = ctx.pickers.visibleModels.value.length
  const isSelected = modelPicker.selectedIdx === visibleCount

  return h(
    'button',
    {
      type: 'button',
      'data-mol-id': 'chat-model-manage-custom',
      onClick: () => {
        const manageMode =
          modelPicker.mode === 'plan' || modelPicker.mode === 'execute'
            ? modelPicker.mode
            : ctx.chat.liveModelMode.value
        ctx.composer.setModelPicker(null)
        ctx.composer.setInputValue('')
        onManageCustomModels({ mode: manageMode })
      },
      onMouseenter: (event: MouseEvent) => {
        const target = event.currentTarget as HTMLElement | null
        if (target) {
          target.style.background =
            'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
        }
      },
      onMouseleave: (event: MouseEvent) => {
        const target = event.currentTarget as HTMLElement | null
        if (target) {
          target.style.background = isSelected
            ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
            : 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)'
        }
      },
      class: cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.w('full')),
      style: {
        flexShrink: '0',
        padding: '9px 12px',
        border: 'none',
        borderTop:
          '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
        color: 'var(--mol-color-primary, #6366f1)',
        cursor: 'pointer',
        textAlign: 'center',
        background: isSelected
          ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
          : 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)',
      },
    },
    [
      t('ide.chat.manageCustomModels', undefined, {
        defaultValue: 'Add or manage your own models…',
      }),
    ],
  )
}
