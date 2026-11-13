<!--
  Binding conformance host: provides the Molecule context, then either calls
  the hook under test during a child's init (Probe), or renders the component
  under test with its props (text slots arrive as snippets).
-->
<script lang="ts">
  import { type Component, untrack } from 'svelte'

  import { setMoleculeContext } from '../../context.js'
  import Probe from './Probe.svelte'

  let {
    config,
    run,
    component: Target,
    props: targetProps,
  }: {
    config: Parameters<typeof setMoleculeContext>[0]
    run?: () => void
    component?: Component<Record<string, unknown>>
    props?: Record<string, unknown>
  } = $props()

  // The case's services are fixed for its whole run.
  setMoleculeContext(untrack(() => config))
</script>

{#if Target}
  <Target {...targetProps} />
{:else if run}
  <Probe {run} />
{/if}
