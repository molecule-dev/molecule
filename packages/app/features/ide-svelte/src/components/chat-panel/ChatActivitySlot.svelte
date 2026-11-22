<!--
  React's section “Persistent activity slot” (ChatPanel.tsx 5590–5660): the ONE
  indicator for everything the agent does, kept mounted so it fades in and out
  instead of reflowing the timeline.

  It is always in the layout (a reserved 28px even when idle) and toggled by
  opacity, never mounted and unmounted, so it can never change the list height.
  The label is the real current activity when it is known — the streaming
  status, or the streaming message's tool/thinking activity — and otherwise the
  sandbox-boot wait copy, exactly as React decides it.

  View only: the state comes from the slices through `ctx`.
-->
<script lang="ts">
  import { streamingActivityLabel } from '@molecule/app-ide-panel-logic'
  import { estimateTurnTokens } from '@molecule/app-ide-panel-logic/panels'

  import StreamingIndicator from '../../parts/StreamingIndicator.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  const isLoading = $derived(ctx.chat.isLoading)
  const isRemoteStreaming = $derived(ctx.chat.isRemoteStreaming)
  // A remote turn (a teammate's send, another tab, a server-side continuation)
  // shows the same live indicator as an own send.
  const showActivity = $derived(isLoading || !!ctx.props.awaitingSandboxBoot || isRemoteStreaming)
  // Only the no-turn-at-all case (awaitingSandboxBoot alone) is a sandbox-boot
  // wait — labeling every !isLoading render with the boot copy showed viewers
  // "Waiting for the development environment…" over a running sandbox.
  const streamingLike = $derived(isLoading || isRemoteStreaming)
  const streamingMsg = $derived(
    streamingLike
      ? [...ctx.timeline.visibleMessages].reverse().find((message) => message.isStreaming)
      : undefined,
  )
  // Turn start = the last genuine user message, so the elapsed timer counts up
  // across the WHOLE turn instead of resetting at each new assistant message.
  const turnStartedAt = $derived.by(() => {
    const messages = ctx.chat.messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.role === 'user' && !message.hidden) {
        return typeof message.timestamp === 'number' ? message.timestamp : undefined
      }
    }
    return undefined
  })
  // Token count is summed across the SAME whole turn (see estimateTurnTokens),
  // so it matches the elapsed timer's span.
  const turnTokens = $derived(estimateTurnTokens(ctx.chat.messages))
  const label = $derived(
    streamingLike
      ? (ctx.chat.streamingStatus ??
          (streamingMsg ? streamingActivityLabel(ctx.env.t, streamingMsg) : undefined))
      : ctx.env.t('ide.chat.awaitingSandbox', undefined, {
          defaultValue: 'Waiting for the development environment to finish starting…',
        }),
  )
  // React's inline style object, written as the DOM serializes it.
  const slotStyle = $derived(
    `min-height: 28px; opacity: ${showActivity ? 1 : 0}; pointer-events: ${
      showActivity ? 'auto' : 'none'
    }; transition: opacity 0.18s ease-out`,
  )
</script>

<div data-mol-id="chat-activity-slot" aria-hidden={!showActivity} style={slotStyle}>
  {#if showActivity}
    <StreamingIndicator
      {label}
      tokens={streamingLike ? turnTokens : undefined}
      startedAt={streamingLike ? turnStartedAt : undefined}
    />
  {/if}
</div>
