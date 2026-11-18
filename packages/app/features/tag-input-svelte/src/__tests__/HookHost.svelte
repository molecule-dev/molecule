<!--
  Test host for the hook tests: runs `useTagInput` during component init with
  the case's options getter and hands the result back to the test. Both props
  are fixed for the life of the mount, like a real component's props.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { UseTagInputOptions, UseTagInputResult } from '../types.js'
  import { useTagInput } from '../useTagInput.js'

  let {
    options,
    expose,
  }: { options: () => UseTagInputOptions; expose: (api: UseTagInputResult) => void } = $props()

  untrack(() => expose(useTagInput(options)))
</script>
