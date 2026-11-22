<!--
  Test host for `SidebarLayout`: provides the Molecule context the sidebar's
  `Link` / `useLocation` need, then renders the component with its own props.
  The conformance kit's host types its `component` prop as
  `Component<Record<string, unknown>>`, which `strictFunctionTypes` will not
  accept for a component with declared props; this host keeps the props type
  flowing into each mount instead.
-->
<script lang="ts">
  import { type Component, type ComponentProps, untrack } from 'svelte'

  import { type MoleculeConfig, setMoleculeContext, setRouterContext } from '@molecule/app-svelte'

  import SidebarLayout from '../SidebarLayout.svelte'

  let {
    config,
    props,
    routedView,
  }: {
    config: MoleculeConfig
    props: ComponentProps<typeof SidebarLayout>
    routedView?: Component
  } = $props()

  // The context is read once during init, so wire the initial values here.
  untrack(() => {
    setMoleculeContext(config)
    // `setMoleculeContext` registers the router without a routed view; a test that renders the
    // layout with no children passes one so the real `RoutedView` renders its page.
    if (config.router) setRouterContext(config.router, { routedView })
  })
</script>

<SidebarLayout {...props} />
