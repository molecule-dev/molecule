<!--
  A test host: renders one component with props taken from a store, so a test
  can hand the SAME mounted component new props (React's `rerender`).
-->
<script lang="ts" generics="P extends object">
  import type { Component, Snippet } from 'svelte'
  import type { Readable } from 'svelte/store'

  let {
    component,
    values,
    children,
  }: { component: Component<P>; values: Readable<P>; children?: Snippet } = $props()

  const View = $derived(component)
</script>

<View {...$values} {children} />
