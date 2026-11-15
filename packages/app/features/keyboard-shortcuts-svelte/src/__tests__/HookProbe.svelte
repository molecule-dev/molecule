<!--
  Calls one function during component init (where Svelte's lifecycle works)
  and renders nothing: the mount for hook unit tests. Both props are fixed
  for the mount; the closure keeps the init-time reference out of reactivity.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  let { call }: { call: () => void } = $props()

  untrack(() => call())
</script>
