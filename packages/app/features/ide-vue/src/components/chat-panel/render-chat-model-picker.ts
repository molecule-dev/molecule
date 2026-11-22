/**
 * The `/model` picker popup — React's render range from `{modelPicker &&`. It
 * composes the picker header (U9), the model rows and region menu (U10) and the
 * host-provided BYO seam (U9).
 *
 * The popup renders only while the picker is open AND there is something to
 * list: the catalog is still loading, or it holds a selectable model, or it
 * holds only deprecated ones.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { ChatCtx } from './context.js'
import { renderChatModelPickerByo } from './render-chat-model-picker-byo.js'
import { renderChatModelPickerHeader } from './render-chat-model-picker-header.js'
import { renderChatModelPickerRows } from './render-chat-model-picker-rows.js'

/**
 * Renders the model picker.
 *
 * @param ctx - The panel context (the picker state, the catalog's loading state and the catalog).
 * @returns The picker, or `null` while it is closed or has nothing to list.
 */
export function renderChatModelPicker(ctx: ChatCtx): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  if (!ctx.composer.modelPicker.value) return null
  const modelsLoading = ctx.models.modelsLoading.value
  const visibleModels = ctx.pickers.visibleModels.value
  const deprecatedModels = ctx.pickers.deprecatedModels.value
  if (!modelsLoading && visibleModels.length === 0 && deprecatedModels.length === 0) return null

  return h(
    'div',
    {
      class: cm.cn(cm.surface, cm.borderAll),
      style: {
        position: 'absolute',
        bottom: '100%',
        left: '0',
        right: '0',
        marginBottom: '0',
        borderRadius: '6px 6px 0 0',
        zIndex: '100',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: ctx.env.popupMaxHeight.value,
      },
    },
    [
      renderChatModelPickerHeader(ctx),
      modelsLoading
        ? h('div', { class: cm.cn(cm.textSize('sm'), cm.textMuted), style: { padding: '12px' } }, [
            t('ide.chat.modelsLoading', undefined, { defaultValue: 'Loading models…' }),
          ])
        : h('div', { style: { overflowY: 'auto', flex: '1' } }, [renderChatModelPickerRows(ctx)]),
      renderChatModelPickerByo(ctx),
    ],
  )
}
