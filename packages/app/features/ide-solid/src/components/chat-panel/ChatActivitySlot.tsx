/**
 * The persistent activity slot — React's render section “Persistent activity
 * slot”: the ONE indicator for everything the agent is doing, plus the scroll
 * sentinel that closes the messages column.
 *
 * It is always in the layout (a reserved 28px even when idle) and toggled by
 * opacity, never mounted and unmounted, so it can never change the list height.
 * The label is the real current activity when it is known — the streaming
 * status, or the streaming message's tool/thinking activity — and otherwise the
 * sandbox-boot wait copy, exactly as React decides it.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createMemo, onCleanup } from 'solid-js'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { streamingActivityLabel } from '@molecule/app-ide-panel-logic'
import { estimateTurnTokens } from '@molecule/app-ide-panel-logic/panels'

import { StreamingIndicator } from '../../parts/StreamingIndicator.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatActivitySlot}. */
export interface ChatActivitySlotProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the activity slot and the scroll sentinel after it.
 * @param props - The inner ctx.
 * @returns The always-mounted slot and the bottom sentinel.
 */
export function ChatActivitySlot(props: ChatActivitySlotProps): JSX.Element {
  const ctx = props.ctx

  // A remote turn (a teammate's send, another tab, a server-side continuation)
  // shows the same live activity indicator as an own send.
  const showActivity = createMemo(
    () => ctx.chat.isLoading() || !!ctx.props.awaitingSandboxBoot || ctx.chat.isRemoteStreaming(),
  )
  // A remote turn streams real messages into the same store, so it gets the SAME
  // activity treatment as an own send. Only the no-turn-at-all case
  // (awaitingSandboxBoot alone) is a sandbox-boot wait.
  const streamingLike = createMemo(() => ctx.chat.isLoading() || ctx.chat.isRemoteStreaming())
  const streamingMessage = createMemo<ChatMessage | undefined>(() =>
    streamingLike()
      ? [...ctx.timeline.visibleMessages()].reverse().find((message) => message.isStreaming)
      : undefined,
  )
  // Turn start = the last genuine user message, so the elapsed timer counts up
  // across the WHOLE turn instead of resetting at each new assistant message.
  const turnStartedAt = createMemo<number | undefined>(() => {
    const messages = ctx.chat.messages()
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index]
      if (message.role === 'user' && !message.hidden) {
        return typeof message.timestamp === 'number' ? message.timestamp : undefined
      }
    }
    return undefined
  })
  // Token count is summed across the SAME whole turn (see estimateTurnTokens),
  // so it matches the elapsed timer's span.
  const turnTokens = createMemo(() => estimateTurnTokens(ctx.chat.messages()))
  const label = createMemo<string | undefined>(() => {
    if (!streamingLike())
      return ctx.env.t('ide.chat.awaitingSandbox', undefined, {
        defaultValue: 'Waiting for the development environment to finish starting…',
      })
    const status = ctx.chat.streamingStatus()
    if (status) return status
    const message = streamingMessage()
    return message ? streamingActivityLabel(ctx.env.t, message) : undefined
  })

  /** React's `messagesEndRef` is cleared on unmount. */
  onCleanup(() => {
    ctx.scroll.messagesEndRef.current = null
  })

  return (
    <>
      <div
        data-mol-id="chat-activity-slot"
        aria-hidden={showActivity() ? 'false' : 'true'}
        style={{
          'min-height': '28px',
          opacity: showActivity() ? '1' : '0',
          'pointer-events': showActivity() ? 'auto' : 'none',
          transition: 'opacity 0.18s ease-out',
        }}
      >
        {showActivity() && (
          <StreamingIndicator
            label={label()}
            tokens={streamingLike() ? turnTokens() : undefined}
            startedAt={streamingLike() ? turnStartedAt() : undefined}
          />
        )}
      </div>
      <div
        ref={(element: HTMLDivElement) => {
          ctx.scroll.messagesEndRef.current = element
        }}
      />
    </>
  )
}
