<!--
  The marker the React tests mock `react-router`'s `Link` with: an `<a href>`
  carrying `data-link`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { to, children }: { to: string; children?: Snippet } = $props()
</script>

<a href={to} data-link>{@render children?.()}</a>
