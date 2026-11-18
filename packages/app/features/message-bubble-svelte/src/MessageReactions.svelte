<!--
  MessageReactions: the Svelte counterpart of
  `@molecule/app-message-bubble-react`'s `MessageReactions` — a row of reaction
  chips plus an optional "+" button. Same props (React names), same DOM for the
  same input; the viewer's own reaction is marked with `aria-pressed` only.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { MessageReactionsProps } from './types.js'

  let { reactions, onToggle, onAdd, className }: MessageReactionsProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className)}>
  {#each reactions as reaction (reaction.emoji)}
    <button
      type="button"
      onclick={() => onToggle?.(reaction.emoji)}
      aria-pressed={reaction.reactedByMe}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 2),
        cm.sp('py', 1),
        cm.textSize('xs'),
        cm.roundedFull,
      )}
    >
      <span>{reaction.emoji}</span>
      <span>{reaction.count}</span>
    </button>
  {/each}
  {#if onAdd}
    <button
      type="button"
      onclick={(event) => onAdd?.(event)}
      class={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}
    >
      +
    </button>
  {/if}
</div>
