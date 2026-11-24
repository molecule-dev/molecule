<!--
  ActivityFeed: the Svelte counterpart of `@molecule/app-activity-feed-react`'s
  `ActivityFeed` — a flat stack of activity rows with an optional empty state
  and footer. Same props (React names), same DOM for the same input. With no
  items and an empty state, React renders the empty state alone, so this
  template's root is the empty-state snippet in that branch; an empty state that
  renders nothing takes React's other branch (the wrapper, with the footer).
-->
<script lang="ts">
  import { ContentOrElse } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ActivityFeedItem from './ActivityFeedItem.svelte'
  import type { ActivityFeedProps } from './types.js'

  let { items, emptyState, footer, className }: ActivityFeedProps = $props()

  const cm = $derived(getClassMap())
</script>

{#if items.length === 0 && emptyState}
  <ContentOrElse>
    {@render emptyState?.()}
    {#snippet otherwise()}
      <div class={cm.cn(cm.stack(4), className)}>
        {#if footer}{@render footer?.()}{/if}
      </div>
    {/snippet}
  </ContentOrElse>
{:else}
  <div class={cm.cn(cm.stack(4), className)}>
    {#each items as item (item.id)}
      <ActivityFeedItem {item} />
    {/each}
    {#if footer}{@render footer?.()}{/if}
  </div>
{/if}
