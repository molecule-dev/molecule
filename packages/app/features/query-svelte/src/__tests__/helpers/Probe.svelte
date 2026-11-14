<!--
  Mounts `useQuery` under a real component, the way an app does: the options
  arrive as a writable store (a changed key re-observes on the same mount),
  every result is published to the test through `capture`, and the document is
  rendered as the text React's `<output>` shows.
-->
<script lang="ts" generics="T">
  import { onDestroy, untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { QueryOptions } from '@molecule/app-query'

  import type { UseQueryResult } from '../../types.js'
  import { useQuery } from '../../useQuery.js'

  let {
    options,
    capture,
  }: {
    options: Readable<QueryOptions<T> | null>
    capture: (result: UseQueryResult<T>) => void
  } = $props()

  // The hook observes the store passed at mount; its CONTENT stays reactive.
  const result = useQuery(untrack(() => options))
  const stop = result.subscribe((value) => capture(value))
  onDestroy(() => stop())
</script>

<output>{$result.data === undefined ? '' : JSON.stringify($result.data)}</output>
