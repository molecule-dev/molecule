<!--
  Sets the services it is given in Svelte context during its initialization, then renders its
  children: the part every provider component shares. A provider renders it under
  `{#key servicesKey(services)}`, so a replaced service initializes it again.
-->
<script lang="ts">
  import { type Snippet, untrack } from 'svelte'

  import type { MoleculeConfig } from '../types.js'
  import { setServiceContexts } from './services.js'

  let { services, children }: { services: MoleculeConfig; children?: Snippet } = $props()

  // Context is set once, at initialization; the parent's `{#key}` re-creates this
  // component when a service changes.
  untrack(() => setServiceContexts(services))
</script>

{@render children?.()}
