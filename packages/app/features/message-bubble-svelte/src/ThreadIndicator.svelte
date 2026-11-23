<!--
  ThreadIndicator: the Svelte counterpart of
  `@molecule/app-message-bubble-react`'s `ThreadIndicator` — a
  `"3 replies · last Monday"` button below a message bubble. Same props (React
  names), same DOM, same pluralized `t('thread.replies', { count }, { count })`
  call.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ThreadIndicatorProps } from './types.js'

  let { replyCount, lastReplyAt, onOpen, className }: ThreadIndicatorProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** React's timestamp separator: a leading space, the middle dot, a space. */
  const DOT = '· '

  const replies = $derived(
    t(
      'thread.replies',
      { count: replyCount },
      {
        count: replyCount,
        defaultValue: '{{count}} replies',
        defaultValue_one: '{{count}} reply',
      },
    ),
  )

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
   * @returns The text, or `''` for a snippet.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

<button
  type="button"
  onclick={(event) => onOpen?.(event)}
  class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs'), cm.link, className)}
>
  <span class={cm.fontWeight('semibold')}>{replies}</span>
  {#if lastReplyAt}
    <span
      >{#if isSnippet(lastReplyAt)}{DOT}{@render lastReplyAt?.()}{:else}{`· ${textOf(lastReplyAt)}`}{/if}</span
    >
  {/if}
</button>
