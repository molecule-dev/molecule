<!--
  A record region whose document ID, viewer and previous-data flag come from
  stores: changing them on the same mount is React's re-render with new props,
  and the mounted action's own state shows whether the branch remounted.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import QueryContent from '../../QueryContent.svelte'
  import PinnedButton from './PinnedButton.svelte'

  let {
    recordId,
    viewer,
    isPreviousData,
  }: {
    recordId: Readable<number>
    viewer: Readable<PropertyKey>
    isPreviousData: Readable<boolean>
  } = $props()
</script>

<QueryContent
  query={{
    data: { id: $recordId },
    status: 'success',
    error: undefined,
    isPreviousData: $isPreviousData,
  }}
  getRecordId={(notebook: { id: number }) => notebook.id}
  recordKey={$viewer}
>
  {#snippet children(_notebook, id)}
    <PinnedButton {id} />
  {/snippet}
</QueryContent>
