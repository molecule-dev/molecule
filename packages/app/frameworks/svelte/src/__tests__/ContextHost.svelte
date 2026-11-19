<!--
  Typed test host: provides the molecule context, then renders the component
  under test with its own props. The conformance host's `component` prop is
  typed for a generic props record, so a component whose props type is narrower
  cannot be handed to it; a generic host keeps every call checked against the
  component it mounts. Mount it through `mountInContext` (./context-host.ts).
-->
<script lang="ts" generics="Props extends Record<string, unknown>">
  import { type Component, untrack } from 'svelte'

  import { setMoleculeContext } from '../context.js'
  import type { MoleculeConfig } from '../types.js'

  let {
    config,
    component: Target,
    props,
  }: {
    config: MoleculeConfig
    component: Component<Props>
    props: Props
  } = $props()

  // The case's services are fixed for the host's whole run.
  untrack(() => setMoleculeContext(config))
</script>

<Target {...props} />
