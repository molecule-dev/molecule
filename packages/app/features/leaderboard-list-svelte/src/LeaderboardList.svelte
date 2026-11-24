<!--
  LeaderboardList: the Svelte counterpart of
  `@molecule/app-leaderboard-list-react`'s `LeaderboardList` — header row
  (title + actions) above a stack of rows. Same props, same DOM for the same
  input; `title`, `actions` and `emptyState` are snippet slots.

  React counts its `children` to choose between the rows and `emptyState`. A
  Svelte snippet is opaque (it has no count), so the rows are data: `items`
  holds one entry per row and the `children` snippet renders one entry.
-->
<script lang="ts" generics="T">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { LeaderboardListProps } from './types.js'

  let {
    items = [],
    children,
    title,
    actions,
    emptyState,
    className,
  }: LeaderboardListProps<T> = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.stack(2), className)}>
  {#if title || actions}
    <header class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
      {#if title}
        <PresentWhileContent tag="h3" class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          >{@render title?.()}</PresentWhileContent
        >
      {/if}
      {#if actions}{@render actions?.()}{/if}
    </header>
  {/if}
  {#if items.length > 0}
    <div class={cm.stack(1)}>
      {#each items as item, i (i)}{@render children?.(item, i)}{/each}
    </div>
  {:else if emptyState}
    {@render emptyState?.()}
  {/if}
</div>
