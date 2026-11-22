/**
 * The staged file-attachment chips — React's render section "File attachment
 * chips", the removable chips above the composer field.
 *
 * Owned by U13, nested inside the input area. Each chip shows an image preview
 * when there is one, the file's name, its size and a remove button whose hit
 * box grows on a coarse pointer.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { formatSize } from '@molecule/app-ide-panel-logic'

import type { ChatCtx } from './context.js'

/**
 * Renders the attachment chips.
 *
 * @param ctx - The panel context (the staged attachments, the ClassMap, the
 *   translations and the pointer kind).
 * @returns The chips' row, or `null` while nothing is staged.
 */
export function renderChatAttachmentChips(ctx: ChatCtx): VNodeChild {
  const attachedFiles = ctx.popups.attachedFiles.value
  if (attachedFiles.length === 0) return null

  const cm = ctx.env.cm
  const t = ctx.env.t
  const isCoarse = ctx.env.isCoarse.value

  return h(
    'div',
    { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 10px 0' } },
    attachedFiles.map((f) => {
      const key = f.path ?? f.filename
      const displayName = f.path ? f.path.split('/').pop() : f.filename
      const name = displayName ?? f.filename
      return h(
        'span',
        {
          key,
          class: cm.cn(cm.surfaceSecondary, cm.textSize('xs')),
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '4px',
            padding: '2px 6px',
          },
        },
        [
          f.previewUrl
            ? h('img', {
                src: f.previewUrl,
                alt: f.filename,
                style: {
                  width: '18px',
                  height: '18px',
                  objectFit: 'cover',
                  borderRadius: '2px',
                },
              })
            : null,
          h('span', { style: { fontFamily: 'monospace', opacity: '0.85' } }, [displayName ?? '']),
          f.size > 0
            ? h('span', { class: cm.textMuted, style: { fontSize: '10px' } }, [formatSize(f.size)])
            : null,
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': `chat-attachment-remove-${key}`,
              'aria-label': t(
                'ide.chat.removeAttachment',
                { name },
                { defaultValue: 'Remove {{name}}' },
              ),
              onClick: () => {
                ctx.attachments.removeAttachment(key)
              },
              style: {
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                opacity: '0.5',
                lineHeight: '1',
                padding: '0px',
                fontSize: '13px',
                // Touch: a bare 13px '×' is untappable — give it a 32px box
                // (the dense-row floor) without changing the fine-pointer chip.
                ...(isCoarse
                  ? {
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '32px',
                      minHeight: '32px',
                    }
                  : {}),
              },
            },
            ['×'],
          ),
        ],
      )
    }),
  )
}
