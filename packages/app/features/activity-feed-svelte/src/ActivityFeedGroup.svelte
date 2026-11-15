<!--
  ActivityFeedGroup: the Svelte counterpart of
  `@molecule/app-activity-feed-react`'s `ActivityFeedGroup` — a date-grouped
  activity section: a heading followed by a stack of rows. Same props (React
  names), same DOM for the same input; the heading is a snippet or plain text.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import ActivityFeedItem from './ActivityFeedItem.svelte'
  import type { ActivityFeedGroupProps } from './types.js'

  let { heading, items, className }: ActivityFeedGroupProps = $props()

  const cm = $derived(getClassMap())
</script>

<section class={cm.cn(cm.stack(3), className)}>
  <h3 class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
    {#if typeof heading === 'function'}{@render heading()}{:else}{heading ?? ''}{/if}
  </h3>
  <div class={cm.stack(4)}>
    {#each items as item (item.id)}
      <ActivityFeedItem {item} />
    {/each}
  </div>
</section>
