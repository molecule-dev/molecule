<!--
  A record region with an edit form, through QueryContent and `recordKey`: the
  form mounts with the current record and resets when the record's identity
  changes, including a switch to a record already in cache.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { QueryOptions } from '@molecule/app-query'

  import QueryContent from '../../QueryContent.svelte'
  import { useQuery } from '../../useQuery.js'
  import ScheduleForm from './ScheduleForm.svelte'

  let {
    options,
    id,
  }: {
    options: Readable<QueryOptions<{ title: string }> | null>
    id: Readable<PropertyKey>
  } = $props()

  // The hook observes the store itself, so a changed key is followed on this mount.
  const query = useQuery(untrack(() => options))
</script>

<QueryContent {query} recordKey={$id}>
  {#snippet pending()}<p role="status">Loading schedule</p>{/snippet}
  {#snippet children(record)}
    <ScheduleForm title={record.title} />
  {/snippet}
</QueryContent>
