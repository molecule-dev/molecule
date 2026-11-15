<!--
  LeaderboardList: the Svelte counterpart of
  `@molecule/app-leaderboard-list-react`'s `LeaderboardList` — header row
  (title + actions) above a stack of rows. Same props, same DOM for the same
  input; `children`, `title`, `actions` and `emptyState` are snippet slots.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { LeaderboardListProps } from './types.js'

  let { children, title, actions, emptyState, className }: LeaderboardListProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.stack(2), className)}>
  {#if title || actions}
    <header class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
      {#if title}
        <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{@render title()}</h3>
      {/if}
      {#if actions}{@render actions()}{/if}
    </header>
  {/if}
  {#if children}
    <div class={cm.stack(1)}>{@render children()}</div>
  {:else if emptyState}
    {@render emptyState()}
  {/if}
</div>
