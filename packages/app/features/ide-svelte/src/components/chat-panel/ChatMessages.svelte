<!--
  React's section “── Messages ──” (ChatPanel.tsx 5236–5300): the scroll port
  for the transcript, the empty-conversation hint, the timeline dispatch (unit
  U4) and the persistent activity slot, ending with the scroll sentinel.

  The empty hint renders ONLY when there is literally nothing else to show: no
  timeline items, no local or remote streaming, no sandbox-boot wait and no
  error banner, so it can never coexist with content. Its height reserves the
  28px always-in-layout activity slot below, so an empty conversation never
  grows a scrollbar.

  View only: the state and the refs come from the slices through `ctx`.
-->
<script lang="ts">
  import Icon from '../Icon.svelte'
  import ChatActivitySlot from './ChatActivitySlot.svelte'
  import ChatTimelineItems from './ChatTimelineItems.svelte'
  import type { ChatContext } from './context.svelte.js'

  /** The section's shared context. */
  let { ctx }: { ctx: ChatContext } = $props()

  const showEmptyHint = $derived(
    !ctx.env.transcriptOnly &&
      ctx.timeline.timeline.length === 0 &&
      !ctx.chat.isLoading &&
      !ctx.chat.isRemoteStreaming &&
      !ctx.props.awaitingSandboxBoot &&
      !ctx.chat.error,
  )
</script>

<!--
  A live log: a new message or card is announced as it is added. `additions`
  only, so a reply that is still streaming is not read out token by token.
  overflowAnchor off: prepending an older page above the viewport is compensated
  by ChatPanel's own anchor effect, so native scroll anchoring must not adjust
  the offset on top of it.
-->
<div
  bind:this={ctx.scroll.messagesContainerRef.current}
  role="log"
  aria-live="polite"
  aria-relevant="additions"
  aria-label={ctx.env.t('ide.chat.messagesLabel', undefined, {
    defaultValue: 'Conversation messages',
  })}
  class={ctx.env.cm.sp('p', 3)}
  style="flex: 1 1 0%; overflow-y: auto; scrollbar-width: thin; overflow-anchor: none"
>
  {#if showEmptyHint}
    <div
      data-mol-id="chat-empty-hint"
      class={ctx.env.cm.cn(ctx.env.cm.textSize('sm'), ctx.env.cm.textMuted)}
      style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: calc(100% - 28px); min-height: 120px; text-align: center"
    >
      <Icon name="logo-mark" size={28} aria-hidden="true" style="opacity: 0.5" />
      <span style="max-width: 320px">
        {ctx.env.t('ide.chat.emptyState', undefined, {
          defaultValue: 'Describe what you want to build...',
        })}
      </span>
    </div>
  {/if}
  <!-- Older history mounts in as the user scrolls near the top — there is
       deliberately no "Show earlier" button. Every item renders inside its own
       boundary (U4): the timeline is built from model-authored data, so one
       malformed payload costs one inline notice, never the whole IDE. -->
  <ChatTimelineItems {ctx} />
  <ChatActivitySlot {ctx} />
  <div bind:this={ctx.scroll.messagesEndRef.current}></div>
</div>
