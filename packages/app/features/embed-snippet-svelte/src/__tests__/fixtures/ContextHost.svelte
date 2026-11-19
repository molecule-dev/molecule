<!--
  Test host: provides the Molecule context, then renders the component under
  test with its own typed props — the conformance `svelte-bindings/Host.svelte`
  with the component and its props paired generically, so a component with
  required props is checked against them.
-->
<script lang="ts" generics="Props extends object">
  import { type Component, untrack } from 'svelte'

  import type { SvelteBinding } from '@molecule/app-framework-conformance/adapters/svelte-bindings'

  let {
    config,
    setMoleculeContext,
    component: Target,
    props,
  }: {
    config: Parameters<SvelteBinding['setMoleculeContext']>[0]
    setMoleculeContext: SvelteBinding['setMoleculeContext']
    component: Component<Props>
    props: Props
  } = $props()

  // The case's services and the binding's context setter are fixed for its whole run.
  untrack(() => setMoleculeContext(config))
</script>

<Target {...props} />
