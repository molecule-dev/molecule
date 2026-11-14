<!--
  Calls one function during component init (where Svelte's lifecycle works) and
  publishes its result to the test: the mount for hooks that take no options.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  let {
    call,
    capture,
  }: {
    call: () => unknown
    capture: (value: unknown) => void
  } = $props()

  // Both props are fixed for the mount: the hook runs once, at init.
  untrack(() => capture(call()))
</script>
