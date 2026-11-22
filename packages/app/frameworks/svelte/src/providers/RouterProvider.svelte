<!--
  Provider for routing, as @molecule/app-react's RouterProvider: the router and, from a routing
  bond that has one, the routed view RoutedView renders (none without one).
-->
<script lang="ts">
  import type { RouterProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { router, routedView, children }: RouterProviderProps = $props()
</script>

{#key router}
  {#key routedView}
    <Provided services={{ router }} routedView={routedView ?? null}>
      {@render children?.()}
    </Provided>
  {/key}
{/key}
