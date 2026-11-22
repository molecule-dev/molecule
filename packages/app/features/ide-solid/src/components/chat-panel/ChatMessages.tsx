/**
 * The messages column — React's render section “── Messages ──”: the scrolling
 * log that carries the transcript and the empty-conversation hint, ending where
 * the per-item dispatch takes over.
 *
 * The hint renders ONLY when there is literally nothing else to show: no
 * timeline items, no local or remote streaming, no sandbox-boot wait (the
 * activity slot's own conditions) and no error banner, so it can never coexist
 * with content. Its height reserves the 28px always-in-layout activity slot, so
 * an empty conversation never grows a scrollbar.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createMemo, onCleanup, Show } from 'solid-js'

import { Icon } from '../Icon.jsx'
import { ChatActivitySlot } from './ChatActivitySlot.jsx'
import { ChatTimelineItems } from './ChatTimelineItems.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatMessages}. */
export interface ChatMessagesProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the messages column.
 * @param props - The inner ctx.
 * @returns The scroll port with the empty hint and the timeline's items.
 */
export function ChatMessages(props: ChatMessagesProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  const showEmptyHint = createMemo(
    () =>
      !ctx.env.transcriptOnly() &&
      ctx.timeline.timeline().length === 0 &&
      !ctx.chat.isLoading() &&
      !ctx.chat.isRemoteStreaming() &&
      !ctx.props.awaitingSandboxBoot &&
      !ctx.chat.error(),
  )

  /** The scroll port's ref: React clears `useRef` on unmount. */
  onCleanup(() => {
    ctx.scroll.messagesContainerRef.current = null
  })

  return (
    <div
      ref={(element: HTMLDivElement) => {
        ctx.scroll.messagesContainerRef.current = element
      }}
      // A live log: a new message or card is announced as it is added.
      // `additions` only, so a reply that is still streaming (text changing
      // inside an existing node) is not read out token by token.
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label={ctx.env.t('ide.chat.messagesLabel', undefined, {
        defaultValue: 'Conversation messages',
      })}
      class={cm.sp('p', 3)}
      // Symmetric padding on all four sides (P3-04) — no scrollbar-gutter:stable
      // reservation (it made the right padding visibly larger than the left).
      // overflowAnchor off: prepending an older page above the viewport is
      // compensated by ChatPanel's own anchor effect, so native scroll
      // anchoring must not adjust the offset on top of it.
      style={{
        // React writes `flex: 1`; the CSSOM serializes it expanded, and a
        // static style object reaches the DOM as the literal attribute here.
        flex: '1 1 0%',
        'overflow-y': 'auto',
        'scrollbar-width': 'thin',
        'overflow-anchor': 'none',
      }}
    >
      <Show when={showEmptyHint()}>
        <div
          data-mol-id="chat-empty-hint"
          class={cm.cn(cm.textSize('sm'), cm.textMuted)}
          style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            gap: '10px',
            height: 'calc(100% - 28px)',
            'min-height': '120px',
            'text-align': 'center',
          }}
        >
          <Icon name="logo-mark" size={28} aria-hidden="true" style={{ opacity: '0.5' }} />
          <span style={{ 'max-width': '320px' }}>
            {/* Reuses the bond's existing key (translated in all locales)
                rather than minting a new one. */}
            {ctx.env.t('ide.chat.emptyState', undefined, {
              defaultValue: 'Describe what you want to build...',
            })}
          </span>
        </div>
      </Show>
      {/* Older history mounts in as the user scrolls near the top — see the
          auto-load-earlier section by the scroll refs. Every item renders inside
          its own boundary: the timeline is built from model-authored data, so
          one malformed payload must cost one inline notice, never the whole IDE. */}
      <ChatTimelineItems ctx={ctx} />
      {/* Inside the scroll port, after the last item, as React renders them: the
          activity slot and the end sentinel scroll with the messages. */}
      <ChatActivitySlot ctx={ctx} />
    </div>
  )
}
