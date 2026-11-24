<!--
  Test helper: a `<b>` that counts its own creations and disposals in `counts[name]`.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'

  let { name, counts }: { name: string; counts: Record<string, [number, number]> } = $props()
  // The props never change in these tests; read once, as the counters are per creation.
  const key = untrack(() => name)
  const entry = untrack(() => (counts[key] ??= [0, 0]))
  entry[0] += 1
  onDestroy(() => (entry[1] += 1))
</script>

<b data-count={key}>{key}</b>
