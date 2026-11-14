<!--
  A mounted list the resource writes refresh: the ul renders always, the rows
  only when the document holds them — the React resource-deletion tests' view.
-->
<script lang="ts" generics="T extends { id: string | number; title: string }">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { QueryOptions } from '@molecule/app-query'

  import { useQuery } from '../../useQuery.js'

  let { options }: { options: Readable<QueryOptions<T[]> | null> } = $props()

  // The hook observes the store passed at mount; its content stays reactive.
  const query = useQuery(untrack(() => options))
</script>

<ul>
  {#each $query.data ?? [] as row (String(row.id))}
    <li>{row.title}</li>
  {/each}
</ul>
