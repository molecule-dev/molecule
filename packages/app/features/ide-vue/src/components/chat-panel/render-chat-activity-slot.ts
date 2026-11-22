/**
 * The persistent activity slot — React's render section "Persistent activity
 * slot": the ONE indicator for everything the agent does, kept mounted so it
 * fades in and out instead of reflowing the timeline.
 *
 * It is always in the layout (a reserved 28px even when idle) and toggled by
 * opacity, never mounted and unmounted, so it can never change the list height.
 * The label is the real current activity when it is known — the streaming
 * status, or the streaming message's tool/thinking activity — and otherwise the
 * sandbox-boot wait copy, exactly as React decides it.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { streamingActivityLabel } from '@molecule/app-ide-panel-logic'
import { estimateTurnTokens } from '@molecule/app-ide-panel-logic/panels'

import { StreamingIndicator } from '../../parts/StreamingIndicator.js'
import type { ChatCtx } from './context.js'

/**
 * Renders the activity slot.
 *
 * @param ctx - The panel context (the transcript, the stream state and the boot wait).
 * @returns The slot, always a node so its reserved height never collapses.
 */
export function renderChatActivitySlot(ctx: ChatCtx): VNodeChild {
  const t = ctx.env.t
  // A remote turn (a teammate's send, another tab, a server-side continuation)
  // shows the same live activity indicator as an own send.
  const isLoading = ctx.chat.isLoading.value
  const isRemoteStreaming = ctx.chat.isRemoteStreaming.value
  const showActivity = isLoading || !!ctx.props.awaitingSandboxBoot || isRemoteStreaming
  // A remote turn streams real messages into the same store, so it gets the SAME
  // activity treatment as an own send. Only the no-turn-at-all case
  // (awaitingSandboxBoot alone) is a sandbox-boot wait.
  const streamingLike = isLoading || isRemoteStreaming
  const messages = ctx.chat.messages.value
  const streamingMsg = streamingLike
    ? [...ctx.timeline.visibleMessages.value].reverse().find((message) => message.isStreaming)
    : undefined
  // Turn start = the last genuine user message, so the elapsed timer counts up
  // across the WHOLE turn instead of resetting at each new assistant message.
  let turnStartedAt: number | undefined
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role === 'user' && !message.hidden) {
      turnStartedAt = typeof message.timestamp === 'number' ? message.timestamp : undefined
      break
    }
  }
  // Token count is summed across the SAME whole turn (see estimateTurnTokens),
  // so it matches the elapsed timer's span.
  const turnTokens = estimateTurnTokens(messages)
  const streamingStatus = ctx.chat.streamingStatus.value
  const label = streamingLike
    ? (streamingStatus ?? (streamingMsg ? streamingActivityLabel(t, streamingMsg) : undefined))
    : t('ide.chat.awaitingSandbox', undefined, {
        defaultValue: 'Waiting for the development environment to finish starting…',
      })
  return h(
    'div',
    {
      'data-mol-id': 'chat-activity-slot',
      'aria-hidden': showActivity ? 'false' : 'true',
      style: {
        minHeight: '28px',
        opacity: showActivity ? '1' : '0',
        pointerEvents: showActivity ? 'auto' : 'none',
        transition: 'opacity 0.18s ease-out',
      },
    },
    showActivity
      ? [
          h(StreamingIndicator, {
            label,
            tokens: streamingLike ? turnTokens : undefined,
            startedAt: streamingLike ? turnStartedAt : undefined,
          }),
        ]
      : [],
  )
}
