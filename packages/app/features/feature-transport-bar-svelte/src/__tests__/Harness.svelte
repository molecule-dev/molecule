<!--
  Test harness: renders the transport bar with a reactive props bag, so a test
  can write a prop and see the mounted element update. The optional `children`
  snippet fills the component's default slot.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import TransportBar from '../TransportBar.svelte'
  import type { PropBag } from './props.svelte.js'

  let { bag, children }: { bag: PropBag; children?: Snippet } = $props()
</script>

{#if children}<TransportBar {...bag.props}>{@render children()}</TransportBar>{:else}<TransportBar
    {...bag.props}
  />{/if}
