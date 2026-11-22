/**
 * The queued messages anchored above the composer — React's render section
 * "Queued messages — anchored above the composer", with the inline editor.
 *
 * Each queued message is one compact single-line row (truncated text + inline
 * edit / delete / send), so several queued messages never grow the footer. The
 * bar is hidden while a popup menu is open, matching the commit bar above it.
 * The editor's textarea takes React's `defaultValue` prop, which Vue writes as
 * the same DOM default value — the live value React's textarea shows — without
 * the `value` attribute a Vue `value` prop would add.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import type { ChatMessage } from '@molecule/app-ai-chat'

import { Icon } from '../Icon.js'
import type { ChatCtx } from './context.js'

/**
 * The inline editor for one queued message.
 *
 * @param ctx - The panel context (the draft, the id under edit and its textarea).
 * @param message - The queued message being edited.
 * @returns The editor row.
 */
function renderQueuedEditor(ctx: ChatCtx, message: ChatMessage): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  const isLight = ctx.env.isLight.value
  const editingQueuedText = ctx.queuedEdit.editingQueuedText.value

  /**
   * Saves the draft: a non-empty text rewrites the message, an emptied one
   * deletes it, and either way the editor closes.
   */
  const save = (): void => {
    const trimmed = ctx.queuedEdit.editingQueuedText.value.trim()
    if (trimmed) ctx.chat.editQueuedMessage(message.id, trimmed)
    else ctx.chat.deleteQueuedMessage(message.id)
    ctx.queuedEdit.setEditingQueuedId(null)
  }

  return h(
    'div',
    { key: message.id, style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
    [
      h('textarea', {
        ref: (element: unknown) => {
          ctx.queuedEdit.queuedEditRef.current =
            element instanceof HTMLTextAreaElement ? element : null
        },
        'aria-label': t('ide.chat.queuedEdit.label', undefined, {
          defaultValue: 'Edit queued message',
        }),
        // React's `defaultValue`: Vue writes the same DOM property, which seeds
        // the textarea's live value without leaving a `value` attribute (a Vue
        // `value` prop would, and React renders none).
        defaultValue: editingQueuedText,
        onInput: (event: Event) => {
          ctx.queuedEdit.setEditingQueuedText((event.target as HTMLTextAreaElement).value)
        },
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            save()
          }
          if (event.key === 'Escape') ctx.queuedEdit.setEditingQueuedId(null)
        },
        class: cm.cn(cm.surface, cm.textSize('sm')),
        style: {
          width: '100%',
          minHeight: '52px',
          padding: '6px 8px',
          border: `1px solid ${isLight ? '#d1d9e0' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '6px',
          resize: 'vertical',
          color: 'inherit',
          fontFamily: 'inherit',
        },
      }),
      h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end' } }, [
        // A Cancel/Save pair sitting side by side: the dismissive one is
        // SECONDARY, the confirming one PRIMARY — the same pairing the rest of
        // the app uses.
        h(
          'button',
          {
            type: 'button',
            'data-mol-id': 'chat-queued-edit-cancel',
            onClick: () => {
              ctx.queuedEdit.setEditingQueuedId(null)
            },
            class: cm.cn(
              cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
              cm.touchTargetCompact,
            ),
          },
          [t('common.cancel', undefined, { defaultValue: 'Cancel' })],
        ),
        h(
          'button',
          {
            type: 'button',
            'data-mol-id': 'chat-queued-edit-save',
            onClick: save,
            class: cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              cm.touchTargetCompact,
            ),
          },
          [t('common.save', undefined, { defaultValue: 'Save' })],
        ),
      ]),
    ],
  )
}

/**
 * Renders the queued-message bar.
 *
 * @param ctx - The panel context (the queue, the popups, the edit state).
 * @returns The bar, or `null` while nothing is queued or a popup is open.
 */
export function renderChatQueuedMessages(ctx: ChatCtx): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  const isCoarse = ctx.env.isCoarse.value
  const queuedMessages = ctx.timeline.queuedMessages.value
  const editingQueuedId = ctx.queuedEdit.editingQueuedId.value
  const isLoading = ctx.chat.isLoading.value

  // Hidden while a popup menu is open, matching the commit bar.
  if (
    queuedMessages.length === 0 ||
    ctx.composer.commandMenu.value ||
    ctx.composer.modelPicker.value ||
    ctx.composer.effortPicker.value ||
    ctx.overlay.panelOverlay.value
  ) {
    return null
  }

  /**
   * The small icon-only control on a queued row (edit / delete / send): a
   * 22px (32px coarse) square with a hover highlight.
   *
   * @param options - Its title, icon, idle colour/opacity and hover highlight.
   * @returns The button.
   */
  const rowButton = (options: {
    title: string
    color: string
    opacity: number
    hoverBackground: string
    onClick: () => void
    children: VNodeChild
  }): VNodeChild =>
    h(
      'button',
      {
        type: 'button',
        title: options.title,
        onClick: options.onClick,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isCoarse ? '32px' : '22px',
          height: isCoarse ? '32px' : '22px',
          flexShrink: 0,
          border: 'none',
          borderRadius: '4px',
          background: 'none',
          color: options.color,
          opacity: options.opacity,
          cursor: 'pointer',
          padding: '0px',
          transition: 'opacity 100ms, background 100ms',
        },
        onMouseenter: (event: MouseEvent) => {
          const target = event.currentTarget as HTMLElement | null
          if (!target) return
          target.style.opacity = '1'
          target.style.background = options.hoverBackground
        },
        onMouseleave: (event: MouseEvent) => {
          const target = event.currentTarget as HTMLElement | null
          if (!target) return
          target.style.opacity = String(options.opacity)
          target.style.background = 'none'
        },
      },
      [options.children],
    )

  return h(
    'div',
    {
      style: {
        borderTop: '1px solid rgba(128,128,128,0.15)',
        padding: '6px 8px 6px 10px',
      },
    },
    [
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' } },
        [
          h(Icon, {
            name: 'clock',
            size: 11,
            'aria-hidden': 'true',
            style: { opacity: 0.5, flexShrink: 0 },
          }),
          h(
            'span',
            { class: cm.cn(cm.textMuted, cm.textSize('xs')), style: { fontStyle: 'italic' } },
            [
              t(
                'ide.chat.queuedCount',
                { count: queuedMessages.length },
                { defaultValue: '{{count}} queued' },
              ),
            ],
          ),
        ],
      ),
      // Cap the height so many queued messages scroll in place rather than
      // pushing the composer down; single-line rows keep it tight.
      h(
        'div',
        {
          style: {
            maxHeight: '132px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          },
        },
        [
          ...queuedMessages.map((qm) =>
            editingQueuedId === qm.id
              ? renderQueuedEditor(ctx, qm)
              : h(
                  'div',
                  {
                    key: qm.id,
                    style: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: '0px' },
                  },
                  [
                    h(
                      'span',
                      {
                        title: qm.content,
                        class: cm.textSize('sm'),
                        style: {
                          flex: 1,
                          minWidth: '0px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          opacity: 0.8,
                        },
                      },
                      [qm.content],
                    ),
                    rowButton({
                      title: t('ide.chat.editQueued', undefined, { defaultValue: 'Edit' }),
                      color: 'inherit',
                      opacity: 0.5,
                      hoverBackground: 'rgba(128,128,128,0.15)',
                      onClick: () => {
                        ctx.queuedEdit.setEditingQueuedId(qm.id)
                        ctx.queuedEdit.setEditingQueuedText(qm.content)
                      },
                      children: h(Icon, { name: 'pencil', size: 13, 'aria-hidden': 'true' }),
                    }),
                    rowButton({
                      title: t('ide.chat.deleteQueued', undefined, { defaultValue: 'Delete' }),
                      // Theme ERROR token, not a per-theme literal — the token
                      // already resolves per theme.
                      color: 'var(--mol-color-error, #dc2626)',
                      opacity: 0.6,
                      hoverBackground:
                        'color-mix(in srgb, var(--mol-color-error, #dc2626) 12%, transparent)',
                      onClick: () => {
                        ctx.chat.deleteQueuedMessage(qm.id)
                      },
                      children: h(Icon, { name: 'trash', size: 13, 'aria-hidden': 'true' }),
                    }),
                    !isLoading &&
                      rowButton({
                        title: t('ide.chat.sendQueued', undefined, { defaultValue: 'Send' }),
                        // Theme SUCCESS token, not a per-theme literal.
                        color: 'var(--mol-color-success, #16a34a)',
                        opacity: 0.7,
                        hoverBackground:
                          'color-mix(in srgb, var(--mol-color-success, #16a34a) 14%, transparent)',
                        onClick: () => {
                          const content = qm.content
                          ctx.chat.deleteQueuedMessage(qm.id)
                          void ctx.chat.sendMessage(content)
                        },
                        // Same up-arrow glyph as the composer's Send button.
                        children: h(
                          'svg',
                          {
                            width: '13',
                            height: '13',
                            viewBox: '0 0 12 12',
                            style: { display: 'block' },
                          },
                          [
                            h('path', {
                              d: 'M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10',
                              fill: 'none',
                              stroke: 'currentColor',
                              'stroke-width': '1.75',
                              'stroke-linecap': 'round',
                              'stroke-linejoin': 'round',
                            }),
                          ],
                        ),
                      }),
                  ],
                ),
          ),
        ],
      ),
    ],
  )
}
