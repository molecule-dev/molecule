<!--
  MessageMeta: the Svelte counterpart of `@molecule/app-message-bubble-react`'s
  `MessageMeta` — a small `[author · timestamp]` row rendered above a message
  body. Same props (React names), same DOM for the same input; node-valued props
  are snippets (or plain text).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import type { MessageMetaProps } from './types.js'

  let { author, timestamp, className }: MessageMetaProps = $props()

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
   * @returns The text, or `''` for a snippet.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

<div class={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.textSize('xs'), className)}>
  <span class={cm.fontWeight('semibold')}
    >{#if isSnippet(author)}{@render author()}{:else}{textOf(author)}{/if}</span
  >
  <span
    >{#if isSnippet(timestamp)}{@render timestamp()}{:else}{textOf(timestamp)}{/if}</span
  >
</div>
