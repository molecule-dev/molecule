<!--
  Calls one canvas hook inside a real component (the way an app does) and
  publishes every value it emits to the test, which is what React's
  `renderHook` gives a test.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  let { call, capture }: { call: () => Readable<unknown>; capture: (value: unknown) => void } =
    $props()

  const store = untrack(() => call())
  const stop = store.subscribe((value) => capture(value))
  onDestroy(() => stop())
</script>
