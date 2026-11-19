<!--
  The pending-view page: an empty archived view must not advertise its
  empty-state action while a different view's document is still loading.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { QueryOptions } from '@molecule/app-query'

  import QueryContent from '../../QueryContent.svelte'
  import { useQuery } from '../../useQuery.js'

  type Page = { rows: string[] }

  let { options }: { options: Readable<QueryOptions<Page> | null> } = $props()

  // The hook observes the store passed at mount; its content stays reactive.
  const query = useQuery(untrack(() => options))
</script>

{#snippet emptyAction()}
  <section><a href="/inventory/new">Add item</a></section>
{/snippet}

<main>
  <nav><a href="/inventory/new">New item</a></nav>
  <QueryContent {query} empty={{ when: (page) => page.rows.length === 0, render: emptyAction }}>
    {#snippet pending()}
      <p role="status">Loading</p>
    {/snippet}
    {#snippet error()}
      <p role="alert">Failed</p>
    {/snippet}
    {#snippet children(page)}
      <ul>
        {#each page.rows as row (row)}
          <li>{row}</li>
        {/each}
      </ul>
    {/snippet}
  </QueryContent>
</main>
