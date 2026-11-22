/**
 * The messages container — React's render section "── Messages ──": the scroll
 * port, the empty-conversation hint, the older-history mount-in, the per-item
 * dispatch and the persistent activity slot, ending with the scroll sentinel.
 *
 * It composes the timeline dispatch (U4) and the activity slot (P5) INSIDE its
 * container, in React's order, so the tree walks exactly as React's JSX does.
 * The empty-conversation hint renders ONLY when there is literally nothing else
 * to show: no timeline items, no local or remote streaming, no sandbox-boot
 * wait (the activity slot's own conditions) and no error banner, so it can
 * never coexist with content.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { Icon } from '../Icon.js'
import type { ChatCtx } from './context.js'
import { renderChatActivitySlot } from './render-chat-activity-slot.js'
import { renderChatTimelineItems } from './render-chat-timeline-items.js'

/**
 * Renders the messages container and everything inside it.
 *
 * @param ctx - The panel context.
 * @returns The scroll port with the timeline, the empty hint, the activity slot and the sentinel.
 */
export function renderChatMessages(ctx: ChatCtx): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  const showEmptyHint =
    !ctx.env.transcriptOnly.value &&
    ctx.timeline.timeline.value.length === 0 &&
    !ctx.chat.isLoading.value &&
    !ctx.chat.isRemoteStreaming.value &&
    !ctx.props.awaitingSandboxBoot &&
    !ctx.chat.error.value

  return h(
    'div',
    {
      ref: (el: unknown) => {
        ctx.scroll.messagesContainerRef.current = el instanceof HTMLDivElement ? el : null
      },
      // A live log: a new message or card is announced as it is added. `additions`
      // only, so a reply that is still streaming is not read out token by token.
      role: 'log',
      'aria-live': 'polite',
      'aria-relevant': 'additions',
      'aria-label': t('ide.chat.messagesLabel', undefined, {
        defaultValue: 'Conversation messages',
      }),
      class: cm.sp('p', 3),
      // Symmetric padding on all four sides (P3-04) — no scrollbar-gutter:stable
      // reservation. overflowAnchor off: prepending an older page above the
      // viewport is compensated by ChatPanel's own anchor effect, so native
      // scroll anchoring must not adjust the offset on top of it.
      style: {
        flex: '1 1 0%',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        overflowAnchor: 'none',
      },
    },
    [
      showEmptyHint
        ? h(
            'div',
            {
              'data-mol-id': 'chat-empty-hint',
              class: cm.cn(cm.textSize('sm'), cm.textMuted),
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                // Height reserves the 28px always-in-layout activity slot below,
                // so an empty conversation never grows a scrollbar.
                height: 'calc(100% - 28px)',
                minHeight: '120px',
                textAlign: 'center',
              },
            },
            [
              h(Icon, {
                name: 'logo-mark',
                size: 28,
                'aria-hidden': 'true',
                style: { opacity: '0.5' },
              }),
              h('span', { style: { maxWidth: '320px' } }, [
                // Reuses the bond's existing key (translated in all locales)
                // rather than minting a new one.
                t('ide.chat.emptyState', undefined, {
                  defaultValue: 'Describe what you want to build...',
                }),
              ]),
            ],
          )
        : null,
      // Older history mounts in as the user scrolls near the top — see the
      // auto-load-earlier section by the scroll refs. There is deliberately no
      // "Show earlier" button: paging happens on scroll, not on click.
      //
      // Every item renders inside its own boundary: the timeline is built from
      // model-authored data, so one malformed payload must cost one inline
      // notice, never the whole IDE.
      renderChatTimelineItems(ctx),
      renderChatActivitySlot(ctx),
      h('div', {
        ref: (el: unknown) => {
          ctx.scroll.messagesEndRef.current = el instanceof HTMLDivElement ? el : null
        },
      }),
    ],
  )
}
