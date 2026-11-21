<!--
  Reads a service during its initialization (where Svelte context is readable) and renders what
  the read returned.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  let { read }: { read: () => string } = $props()

  const text = untrack(() => read())
</script>

<p>{text}</p>
