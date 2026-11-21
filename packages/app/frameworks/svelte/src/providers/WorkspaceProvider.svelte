<!--
  Provider for the IDE workspace, as @molecule/app-react's WorkspaceProvider.
-->
<script lang="ts">
  import type { WorkspaceProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: WorkspaceProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ workspace: provider }}>
    {@render children?.()}
  </Provided>
{/key}
