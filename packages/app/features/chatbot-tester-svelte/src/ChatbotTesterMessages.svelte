<!--
  ChatbotTesterMessages: the Svelte counterpart of
  `@molecule/app-chatbot-tester-react`'s `ChatbotTesterMessages` — scrollable
  transcript with left-aligned (assistant) and right-aligned (user) bubbles, the
  typing indicator while a reply is pending, and React's empty-state branch.
  Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ChatbotTesterMessagesProps } from './types.js'

  let { messages, loading, emptyState }: ChatbotTesterMessagesProps = $props()

  const cm = $derived(getClassMap())

  /** React's branch: no messages, not loading, and an empty state was given. */
  const showsEmptyState = $derived(!loading && messages.length === 0 && Boolean(emptyState))

  /**
   * React's `slot(emptyState)`: `undefined` until the empty state has rendered once, then whether
   * it renders something — a snippet that renders nothing takes the transcript branch instead.
   */
  let hasEmpty = $state<boolean>()
</script>

{#if showsEmptyState}
  <PresentWhileContent
    class={cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' }))}
    present={hasEmpty}
  >
    <ContentOrElse bind:present={hasEmpty}>
      {#if typeof emptyState === 'function'}{@render emptyState?.()}{:else}{emptyState}{/if}
    </ContentOrElse>
  </PresentWhileContent>
{/if}
{#if !showsEmptyState || hasEmpty === false}
  <div class={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 4), cm.chatbotTesterMessageList)}>
    <div class={cm.stack(3)}>
      {#each messages as msg (msg.id)}
        {@const isUser = msg.role === 'user'}
        <div class={cm.cn(cm.flex({ justify: isUser ? 'end' : 'start' }))}>
          <!-- prettier-ignore -->
          <div
            class={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.chatbotTesterMessageBubble,
              isUser ? cm.chatbotTesterMessageBubbleUser : cm.chatbotTesterMessageBubbleBot,
            )}
          >{msg.content}{#if msg.timestamp}<div class={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 1),
                isUser ? cm.chatbotTesterMessageTimeUser : cm.chatbotTesterMessageTimeBot,
              )}>{msg.timestamp}</div>{/if}</div>
        </div>
      {/each}
      {#if loading}
        <div class={cm.cn(cm.textSize('xs'), cm.chatbotTesterTypingIndicator)}>...</div>
      {/if}
      <div></div>
    </div>
  </div>
{/if}
