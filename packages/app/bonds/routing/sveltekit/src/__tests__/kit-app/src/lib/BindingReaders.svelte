<!--
  The Svelte form of React's `Probe` in the bond's `binding-router` cases: it reads the router
  through `@molecule/app-svelte`'s own hooks, which only the provider above supplies. The root
  layout mounts it below the provider, outside the page, so it stays mounted across a
  navigation.
-->
<script lang="ts">
  import { useLocation, useRouterInstance } from '@molecule/app-svelte'

  import { bindingProbe } from './binding-probe.js'

  bindingProbe().bindingRouters.push(useRouterInstance())
  const location = useLocation()
</script>

<span data-probe="">{$location.pathname}</span>
