/**
 * The chat's drag-and-drop overlay — React's first render section, "Drag
 * overlay — covers entire chat area". It covers the whole chat while files are
 * hovered over it.
 *
 * Owned by U13 (attachments).
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { ChatCtx } from './context.js'

/**
 * Renders the drag overlay.
 *
 * @param ctx - The panel context (whether a drag is over the chat, the theme
 *   and the translation).
 * @returns The overlay, or `null` while no drag is hovering the chat.
 */
export function renderChatDragOverlay(ctx: ChatCtx): VNodeChild {
  if (!ctx.attachments.isDragOver.value) return null

  const cm = ctx.env.cm
  const t = ctx.env.t
  const themeMode = ctx.env.themeMode.value

  return h(
    'div',
    {
      style: {
        position: 'absolute',
        inset: '0px',
        zIndex: '60',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(64,112,224,0.2)',
        border: '2px dashed rgba(64,112,224,0.5)',
        borderRadius: '6px',
        pointerEvents: 'none',
      },
    },
    [
      h(
        'span',
        {
          class: cm.textSize('sm'),
          style: {
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: '600',
            background: themeMode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
            color: themeMode === 'dark' ? '#1a1a1a' : '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          },
        },
        [t('ide.chat.dropFilesHere', undefined, { defaultValue: 'Drop files here' })],
      ),
    ],
  )
}
