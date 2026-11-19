<!--
  Test host for the declared-props port: exposes the `useToast()` context a
  caller gets inside a `ToastProvider`, so the test can drive `addToast` and
  `removeToast` the way a component would.
-->
<script lang="ts">
  import { onMount } from 'svelte'

  import { type ToastContextValue, useToast } from '../toast.js'

  let { capture }: { capture: (api: ToastContextValue) => void } = $props()

  // The context must be read during initialization; the hand-off to the test
  // happens once the component is mounted.
  const api = useToast()
  onMount(() => capture(api))
</script>
