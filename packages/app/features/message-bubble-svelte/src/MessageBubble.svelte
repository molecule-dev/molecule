<!--
  MessageBubble: the Svelte counterpart of
  `@molecule/app-message-bubble-react`'s `MessageBubble` — one message: avatar,
  author/timestamp row, body, and optional attachments/reactions/thread rows.
  Same props (React names), same DOM for the same input. `isSelf` only flips the
  row direction; no bubble tint ships.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import MessageMeta from './MessageMeta.svelte'
  import type { MessageBubbleProps } from './types.js'

  let { message, isSelf, showMeta = true, className }: MessageBubbleProps = $props()

  const cm = $derived(getClassMap())

  /**
   * Whether a value is a snippet rather than plain text.
   *
   * @param value - The prop value.
   * @returns True when the value renders as a snippet.
   */
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text a value renders (React renders strings and numbers as text).
   *
   * @param value - The prop value.
   * @returns The text, or `''` for a snippet or absent value.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

<article
  class={cm.cn(
    cm.flex({ align: 'start', gap: 'sm', direction: isSelf ? 'row-reverse' : 'row' }),
    className,
  )}
>
  <div class={cm.shrink0}>
    <Avatar
      src={message.author.avatarSrc}
      alt={message.author.name}
      name={message.author.name}
      size="sm"
    />
  </div>
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    {#if showMeta}
      <MessageMeta author={message.author.name} timestamp={message.timestamp} />
    {/if}
    <div class={cm.cn(cm.sp('p', 3))}>
      {#if isSnippet(message.body)}{@render message.body()}{:else}{textOf(message.body)}{/if}
    </div>
    {#if message.attachments}
      <div class={cm.sp('mt', 1)}>
        {#if isSnippet(message.attachments)}{@render message.attachments()}{:else}{textOf(
            message.attachments,
          )}{/if}
      </div>
    {/if}
    {#if message.reactions}
      <div class={cm.sp('mt', 1)}>
        {#if isSnippet(message.reactions)}{@render message.reactions()}{:else}{textOf(
            message.reactions,
          )}{/if}
      </div>
    {/if}
    {#if message.thread}
      <div class={cm.sp('mt', 1)}>
        {#if isSnippet(message.thread)}{@render message.thread()}{:else}{textOf(
            message.thread,
          )}{/if}
      </div>
    {/if}
  </div>
</article>
