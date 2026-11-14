<!--
  A record region through QueryContent: the record's own action button mounts
  only with the document, and a failed initial read renders the alert. The
  query result and the error snippet's renders are published to the test.
-->
<script lang="ts" generics="T">
  import { onDestroy, untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { QueryOptions } from '@molecule/app-query'

  import QueryContent from '../../QueryContent.svelte'
  import type { UseQueryResult } from '../../types.js'
  import { useQuery } from '../../useQuery.js'

  let {
    options,
    capture,
    onCommit,
    onError,
    label,
  }: {
    options: Readable<QueryOptions<T> | null>
    capture?: (result: UseQueryResult<T>) => void
    onCommit?: (record: T) => void
    onError?: () => void
    label?: (record: T) => string
  } = $props()

  // The hook observes the store passed at mount; its content stays reactive.
  const query = useQuery(untrack(() => options))
  const stop = query.subscribe((value) => capture?.(value))
  onDestroy(() => stop())
</script>

<QueryContent {query}>
  {#snippet children(record)}
    <button type="button" onclick={() => onCommit?.(record)}>
      {label ? label(record) : String(record)}
    </button>
  {/snippet}
  {#snippet error(failure)}
    {@const _reported = onError?.()}
    <p role="alert">Failed ({String(failure)})</p>
  {/snippet}
</QueryContent>
