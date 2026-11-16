<!--
  Test harness: renders the component under test with a reactive props bag, so
  a test can write a prop and see the mounted element update. The optional
  `children` snippet fills the component's default slot.
-->
<script lang="ts">
  import type { Component, Snippet } from 'svelte'

  import type { PropBag } from './props.svelte.js'

  let {
    component: Target,
    bag,
    children,
  }: { component: Component<Record<string, unknown>>; bag: PropBag; children?: Snippet } = $props()
</script>

{#if children}<Target {...bag.props}>{@render children()}</Target>{:else}<Target
    {...bag.props}
  />{/if}
