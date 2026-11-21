<!--
  A stand-in for the router `Link` in the unit tests: an `<a href>` carrying
  every other attribute, which is the observable part of the real component
  (its navigation rules are the binding's own conformance-tested behavior).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { to, children, ...rest }: { to: string; children?: Snippet } = $props()
</script>

<a {...rest} href={to}>{@render children?.()}</a>
