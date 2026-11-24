<!--
  Wraps its children whenever a children snippet is passed, whatever it renders; and its footer
  whenever a footer snippet is passed. A fixture for conformance-adapter-children-null.test.ts.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, footer }: { children?: Snippet; footer?: Snippet } = $props()
</script>

{#if children}
  <section data-wrapper="">{@render children()}</section>
{:else}
  <p>no rows</p>
{/if}
{#if footer}
  <footer>{@render footer()}</footer>
{:else}
  <p>no footer</p>
{/if}
