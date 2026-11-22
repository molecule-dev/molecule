/**
 * The conversation-selector header — React's render section "── Header:
 * conversation selector", rendered by the OUTER panel above the inner chat.
 *
 * The header names the active conversation (or "Chat history"), carries the
 * share / bug-report / settings / new-chat buttons and the searchable history
 * dropdown. The imperative hover affordances mutate the elements' own styles,
 * exactly as React's handlers do, and every value comes from the header slice,
 * so the section itself holds no state.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { relativeTime } from '@molecule/app-ide-panel-logic'

import { Icon } from '../Icon.js'
import type { ChatPanelCtx } from './context.js'

/**
 * Renders the conversation-selector header.
 *
 * @param ctx - The outer panel context.
 * @returns The header, or `null` in headless mode or during discovery.
 */
export function renderChatHeader(ctx: ChatPanelCtx): VNodeChild {
  const { props, env } = ctx
  if (!props.renderConversationHeader || props.hideConversationMenu) return null

  const cm = env.cm
  const t = env.t
  const header = ctx.header
  const shareAllowed = env.shareAllowed.value
  const isNarrow = env.isNarrow.value
  const isCoarse = env.isCoarse.value
  const activeConversation = header.activeConversation.value
  const rows = header.filteredConversations.value

  return h(
    'div',
    {
      ref: header.dropdownRef,
      className: cm.cn(
        cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
        cm.sp('px', 2),
        cm.shrink0,
        cm.borderB,
      ),
      style: {
        position: 'relative',
        // Fixed 33px on fine pointers; on touch the header grows to fit the
        // cm.touchTarget (44px) header buttons instead of clipping them.
        ...(isCoarse ? {} : { height: '33px' }),
        minHeight: '33px',
        zIndex: 10,
      },
    },
    [
      // Conversation picker button
      h(
        'button',
        {
          // mol-bespoke-button: conversation picker — the header title row, a full-width disclosure for the history dropdown
          type: 'button',
          'data-mol-id': 'chat-conversation-toggle',
          onClick: header.toggleDropdown,
          className: cm.cn(cm.textSize('xs'), cm.textMuted),
          onMouseenter: (event: MouseEvent) => {
            const span = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
              'span',
            )
            if (span) span.style.opacity = '1'
          },
          onMouseleave: (event: MouseEvent) => {
            const span = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
              'span',
            )
            if (span) span.style.opacity = '0.7'
          },
          style: {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            padding: '6px 6px 6px 0',
            textAlign: 'left',
            overflow: 'hidden',
            borderRadius: '4px',
          },
        },
        [
          h(
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              viewBox: '0 0 16 16',
              width: '16',
              height: '16',
              style: {
                display: 'block',
                flexShrink: '0',
                opacity: 0.5,
                transform: header.showDropdown.value ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 100ms',
              },
            },
            [
              h('polyline', {
                points: '6,4 10,8 6,12',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '1.5',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
              }),
            ],
          ),
          h(
            'span',
            {
              style: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: 0.7,
              },
            },
            activeConversation?.preview ??
              t('ide.chat.historyFallback', undefined, { defaultValue: 'Chat history' }),
          ),
        ],
      ),

      // Share button — opens the /share link modal. Hidden below the
      // host's share capability (admin+ on molecule.dev), viewers included.
      shareAllowed
        ? h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'chat-share-button',
              onClick: header.openShare,
              className: cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget),
              title: t('ide.chat.share.openShare', undefined, { defaultValue: 'Share project' }),
              'aria-label': t('ide.chat.share.openShare', undefined, {
                defaultValue: 'Share project',
              }),
              style: { flexShrink: '0', display: 'inline-flex', alignItems: 'center' },
            },
            [h(Icon, { name: 'share', size: 14, 'aria-hidden': 'true' })],
          )
        : null,

      // Bug-report button — opens the /report modal
      h(
        'button',
        {
          type: 'button',
          'data-mol-id': 'chat-report-button',
          onClick: header.openReport,
          className: cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget),
          title: t('ide.chat.report.openReport', undefined, { defaultValue: 'Report a bug' }),
          'aria-label': t('ide.chat.report.openReport', undefined, {
            defaultValue: 'Report a bug',
          }),
          style: { flexShrink: '0', display: 'inline-flex', alignItems: 'center' },
        },
        [h(Icon, { name: 'bug', size: 14, 'aria-hidden': 'true' })],
      ),

      // Settings button — opens the /settings view
      h(
        'button',
        {
          type: 'button',
          'data-mol-id': 'chat-settings-button',
          onClick: header.openSettings,
          className: cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget),
          title: t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' }),
          'aria-label': t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' }),
          style: { flexShrink: '0', display: 'inline-flex', alignItems: 'center' },
        },
        [h(Icon, { name: 'gear', size: 14, 'aria-hidden': 'true' })],
      ),

      // New chat button — hidden for viewers (creating a conversation is editor work)
      props.canEdit !== false
        ? h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'chat-new-conversation',
              onClick: header.newChat,
              className: cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget),
              title: t('ide.chat.newChat', undefined, { defaultValue: 'New chat' }),
              style: { flexShrink: '0' },
            },
            ['+'],
          )
        : null,

      // Dropdown
      header.showDropdown.value
        ? h(
            'div',
            {
              className: cm.cn(cm.surface, cm.borderAll),
              style: {
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                // dvh on phones (vh ignores collapsing browser chrome); the fixed
                // 280px cap is desktop-only. (molecule-dev hides this header, but
                // other consumers render it.)
                maxHeight: isNarrow ? 'min(50dvh, 420px)' : '280px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                borderRadius: '0 0 6px 6px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
              },
            },
            [
              // Search
              h(
                'div',
                {
                  style: {
                    padding: '6px 10px',
                    borderBottom: '1px solid rgba(128,128,128,0.12)',
                    position: 'sticky',
                    top: 0,
                  },
                  className: cm.surface,
                },
                [
                  h('input', {
                    ref: header.convSearchRef,
                    value: header.convSearch.value,
                    onInput: (event: Event) => {
                      header.setConvSearch((event.target as HTMLInputElement).value)
                    },
                    placeholder: t('ide.chat.searchConversations', undefined, {
                      defaultValue: 'Search conversations…',
                    }),
                    className: cm.textSize('xs'),
                    style: {
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'inherit',
                      // Deliberate iOS-zoom guard overriding cm.textSize('xs'): a
                      // focused input below 16px makes iOS Safari zoom the page.
                      ...(isNarrow ? { fontSize: '16px' } : {}),
                    },
                    // React keeps the controlled input's `value` ATTRIBUTE in
                    // step with the live value; Vue's own binding writes the
                    // property alone, so the attribute is mirrored here.
                    onVnodeMounted: (vnode) => {
                      const el = vnode.el as HTMLInputElement | null
                      if (el) el.setAttribute('value', el.value)
                    },
                    onVnodeUpdated: (vnode) => {
                      const el = vnode.el as HTMLInputElement | null
                      if (el) el.setAttribute('value', el.value)
                    },
                  }),
                ],
              ),

              // Conversation list
              rows.length === 0
                ? h(
                    'div',
                    {
                      className: cm.cn(cm.textMuted, cm.textSize('xs')),
                      style: { padding: '10px 12px' },
                    },
                    [
                      t('ide.chat.noConversations', undefined, {
                        defaultValue: 'No conversations yet',
                      }),
                    ],
                  )
                : null,
              ...rows.map((conversation) =>
                h(
                  'button',
                  {
                    // mol-bespoke-button: conversation row — full-width list item in the history dropdown
                    key: conversation.id,
                    type: 'button',
                    'data-mol-id': `chat-conversation-${conversation.id}`,
                    onClick: () => header.selectConversation(conversation.id),
                    className: cm.cn(
                      cm.w('full'),
                      conversation.id === header.activeConversationId.value
                        ? cm.surfaceSecondary
                        : '',
                    ),
                    onMouseenter: (event: MouseEvent) => {
                      const el = event.currentTarget as HTMLElement | null
                      if (el) el.style.background = 'rgba(128,128,128,0.1)'
                    },
                    onMouseleave: (event: MouseEvent) => {
                      const el = event.currentTarget as HTMLElement | null
                      if (el) el.style.background = ''
                    },
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      padding: '8px 12px',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      textAlign: 'left',
                    },
                  },
                  [
                    h(
                      'span',
                      {
                        className: cm.textSize('xs'),
                        style: {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        },
                      },
                      [
                        conversation.preview ??
                          t('ide.chat.newConversation', undefined, {
                            defaultValue: 'New conversation',
                          }),
                      ],
                    ),
                    h(
                      'span',
                      {
                        className: cm.cn(cm.textMuted, cm.textSize('xs')),
                        style: { opacity: 0.55 },
                      },
                      [relativeTime(conversation.updatedAt)],
                    ),
                  ],
                ),
              ),
            ],
          )
        : null,
    ],
  )
}
