<!--
  @component
  `MoleculeRouterProvider`: builds ONE molecule `Router` over the SvelteKit navigation the
  root layout hands in, bonds it as the active singleton (`@molecule/app-routing`'s
  `setRouter`), provides it to the components below through the bond's own context, and
  renders `children`.

  React's `MoleculeRouterProvider` in Svelte's idiom: mount it once in the root layout,
  around the rendered page. `useMoleculeRouter` and the hooks built on it read the router
  from here; core `navigate()` / `getRouter()` drive this router because of the bond.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setRouter } from '@molecule/app-routing'

  import { createSvelteKitRouter } from './provider.js'
  import type { MoleculeRouterProviderProps } from './provider-props.js'
  import { provideMoleculeRouter } from './router-context.js'

  let { navigation, routes, onRouterReady, signInPath, children }: MoleculeRouterProviderProps =
    $props()

  // Built once, during this component's initialisation, the way React's provider builds it
  // in a state initializer: every navigation and every later render keeps this one router,
  // so its subscribers and guards survive for the provider's whole mounted life. `untrack`
  // is how Svelte says these initial props are read on purpose, not re-read reactively.
  const router = untrack(() => createSvelteKitRouter(navigation, { routes, signInPath }))

  // Bonded first, so `onRouterReady` and the page below see a router `getRouter()` returns.
  setRouter(router)
  provideMoleculeRouter(router)
  untrack(() => onRouterReady?.(router))

  // The routes the router was created with are already registered; a later array registers
  // onto THIS router instead of replacing it, as React's provider does.
  let registeredRoutes = untrack(() => routes)
  $effect(() => {
    if (routes === registeredRoutes) return
    registeredRoutes = routes
    router.registerRoutes(routes ?? [])
  })
</script>

{@render children()}
