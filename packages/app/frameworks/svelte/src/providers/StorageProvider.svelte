<!--
  Provider for storage, as @molecule/app-react's StorageProvider.
-->
<script lang="ts">
  import type { StorageProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: StorageProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ storage: provider }}>
    {@render children?.()}
  </Provided>
{/key}
