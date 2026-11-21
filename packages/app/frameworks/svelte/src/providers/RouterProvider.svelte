<!--
  Provider for routing, as @molecule/app-react's RouterProvider.
-->
<script lang="ts">
  import type { RouterProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { router, children }: RouterProviderProps = $props()
</script>

{#key router}
  <Provided services={{ router }}>
    {@render children?.()}
  </Provided>
{/key}
