<!--
  Test fixture: stands in for `@molecule/app-svelte`'s `Link`, which needs the
  molecule router context. Like react-router's `<Link>`, it renders an anchor
  carrying `href` and forwards every other attribute.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { to, children, ...anchor }: { to: string; children?: Snippet } & Record<string, unknown> =
    $props()
</script>

<a {...anchor} href={to} data-link="">{@render children?.()}</a>
