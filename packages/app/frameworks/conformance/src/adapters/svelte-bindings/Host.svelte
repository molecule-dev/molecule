<!--
  Binding conformance host: provides the Molecule context, then either calls
  the hook under test during a child's init (Probe), or renders the component
  under test with its props (text slots arrive as snippets).
-->
<script lang="ts">
  import { type Component, setContext, untrack } from 'svelte'

  import type { SvelteBinding } from '../svelte-bindings.js'
  import Probe from './Probe.svelte'
  import { ROUTED_TEXT_KEY } from './routed-text.js'
  import RoutedText from './RoutedText.svelte'

  let {
    config,
    setMoleculeContext,
    setRouterContext,
    routedView,
    run,
    component: Target,
    props: targetProps,
  }: {
    config: Parameters<SvelteBinding['setMoleculeContext']>[0]
    setMoleculeContext: SvelteBinding['setMoleculeContext']
    setRouterContext?: SvelteBinding['setRouterContext']
    routedView?: string
    run?: () => void
    component?: Component<Record<string, unknown>>
    props?: Record<string, unknown>
  } = $props()

  // The case's services and the binding's context setters are fixed for its whole run. A case
  // with a routed view sets the router again with the view, as a routing bond does.
  untrack(() => {
    setMoleculeContext(config)
    if (routedView !== undefined && config.router) {
      if (!setRouterContext)
        throw new Error("Host: a case with a routed view needs the binding's setRouterContext")
      setContext(ROUTED_TEXT_KEY, routedView)
      setRouterContext(config.router, { routedView: RoutedText })
    }
  })
</script>

{#if Target}
  <Target {...targetProps} />
{:else if run}
  <Probe {run} />
{/if}
