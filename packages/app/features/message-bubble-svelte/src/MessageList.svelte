<!--
  MessageList: the Svelte counterpart of
  `@molecule/app-message-bubble-react`'s `MessageList` — a stack of message
  bubbles with optional date separators. Same props (React names), same DOM for
  the same input. With no messages and an empty state, React renders the empty
  state alone, so this template's root is that snippet in that branch.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import MessageBubble from './MessageBubble.svelte'
  import type { MessageListProps } from './types.js'

  let { messages, selfAuthorId, renderDateSeparator, emptyState, className }: MessageListProps =
    $props()

  const cm = $derived(getClassMap())
</script>

{#if messages.length === 0 && emptyState}
  {#if typeof emptyState === 'function'}{@render emptyState()}{:else}{emptyState}{/if}
{:else}
  <div class={cm.cn(cm.stack(3), className)}>
    {#each messages as message, index (message.id)}
      <div class={cm.stack(2)}>
        {#if renderDateSeparator}{@render renderDateSeparator(message, index)}{/if}
        <MessageBubble {message} isSelf={message.author.id === selfAuthorId} />
      </div>
    {/each}
  </div>
{/if}
