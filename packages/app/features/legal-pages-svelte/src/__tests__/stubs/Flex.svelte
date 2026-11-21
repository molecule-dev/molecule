<!-- A stand-in for the UI `Flex` in the unit tests: a `<div>` carrying `data-flex`. -->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<div data-flex="">{@render children?.()}</div>
