<!--
  A list region through QueryContent: status outside the list, real rows inside
  the children snippet, each row's button picking it — the documented shape the
  React tests drive.
-->
<script lang="ts" generics="T">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { QueryOptions } from '@molecule/app-query'

  import QueryContent from '../../QueryContent.svelte'
  import { useQuery } from '../../useQuery.js'

  let {
    options,
    onPick,
  }: {
    options: Readable<QueryOptions<T[]> | null>
    onPick: (item: T) => void
  } = $props()

  // The hook observes the store passed at mount; its content stays reactive.
  const query = useQuery(untrack(() => options))
</script>

<QueryContent {query}>
  {#snippet pending()}
    <p role="status">Loading…</p>
  {/snippet}
  {#snippet children(items)}
    <ul>
      {#each items as item (JSON.stringify(item))}
        <li><button type="button" onclick={() => onPick(item)}>{String(item)}</button></li>
      {/each}
    </ul>
  {/snippet}
</QueryContent>
