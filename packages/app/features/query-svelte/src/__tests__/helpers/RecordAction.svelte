<!--
  A record region whose query state and identity come from stores, so a test
  changes them on the same mount: the QueryContent counterpart of React's
  re-render with new props, with a record action that receives the ID.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import type { QueryState } from '@molecule/app-query'

  import QueryContent from '../../QueryContent.svelte'

  interface Notebook {
    id?: string
    pinned: boolean
  }

  let {
    source,
    onPin,
  }: {
    source: Readable<Pick<QueryState<Notebook>, 'data' | 'status' | 'error' | 'isPreviousData'>>
    onPin: (id: string) => void
  } = $props()
</script>

<QueryContent query={$source} getRecordId={(notebook: Notebook) => notebook.id}>
  {#snippet pending()}<p role="status">Loading notebook</p>{/snippet}
  {#snippet children(_notebook, id)}
    <button type="button" onclick={() => onPin(id)}>Pin notebook</button>
  {/snippet}
</QueryContent>
