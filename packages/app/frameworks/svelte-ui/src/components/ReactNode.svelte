<!--
  ReactNode: internal helper rendering a React-node-valued prop, which in
  Svelte arrives either as a snippet (slots and node lists) or as a plain
  string/number (string props pass through verbatim). Not exported: React's
  package has no such export.
-->
<script lang="ts">
  import type { ReactNodeProps } from '../types.js'

  let { node }: ReactNodeProps = $props()
</script>

{#if typeof node === 'string' || typeof node === 'number'}{node}{:else}{@render node?.()}{/if}
