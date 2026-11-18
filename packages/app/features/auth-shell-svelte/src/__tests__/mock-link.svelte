<!--
  A stand-in for the binding's `Link` in the unit tests: renders a plain
  `<a href data-link>` anchor, the same shape the React suite mocks react-router
  with.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { to = '/', children }: { to?: string; children?: Snippet } = $props()
</script>

<a href={to} data-link="">{@render children?.()}</a>
