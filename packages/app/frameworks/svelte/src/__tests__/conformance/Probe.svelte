<!--
  Calls the hook under test once, during component init (where Svelte's
  getContext works), and renders nothing.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  let { run }: { run: () => void } = $props()

  untrack(() => run())
</script>
