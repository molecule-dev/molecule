<!--
  Binding conformance host: provides the Molecule context, then either calls
  the hook under test during a child's init (Probe), or renders the component
  under test with its props (text slots arrive as snippets).
-->
<script lang="ts">
  import { type Component, untrack } from 'svelte'

  import type { SvelteBinding } from '../svelte-bindings.js'
  import Probe from './Probe.svelte'

  let {
    config,
    setMoleculeContext,
    run,
    component: Target,
    props: targetProps,
  }: {
    config: Parameters<SvelteBinding['setMoleculeContext']>[0]
    setMoleculeContext: SvelteBinding['setMoleculeContext']
    run?: () => void
    component?: Component<Record<string, unknown>>
    props?: Record<string, unknown>
  } = $props()

  // The case's services and the binding's context setter are fixed for its whole run.
  untrack(() => setMoleculeContext(config))
</script>

{#if Target}
  <Target {...targetProps} />
{:else if run}
  <Probe {run} />
{/if}
