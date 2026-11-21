<!--
  Provider for state management, as @molecule/app-react's StateProvider.
-->
<script lang="ts">
  import type { StateProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: StateProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ state: provider }}>
    {@render children?.()}
  </Provided>
{/key}
