<!--
  The initial-collection page: the empty-state action is offered only once a
  document exists, and the pending content renders before that.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import QueryContent from '../../QueryContent.svelte'
  import { useQuery } from '../../useQuery.js'

  type Page = { rows: string[] }

  let { request }: { request: Promise<Page> } = $props()

  const query = useQuery<Page>(untrack(() => ({ key: ['inventory'], fetch: async () => request })))
</script>

{#snippet emptyAction()}
  <a href="/inventory/new">Add item</a>
{/snippet}

<QueryContent {query} empty={{ when: (page) => page.rows.length === 0, render: emptyAction }}>
  {#snippet pending()}
    <p>Loading</p>
  {/snippet}
  {#snippet children(page)}
    <p>{page.rows.join(', ')}</p>
  {/snippet}
</QueryContent>
