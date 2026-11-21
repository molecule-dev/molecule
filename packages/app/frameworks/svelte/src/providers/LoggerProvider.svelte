<!--
  Provider for logging, as @molecule/app-react's LoggerProvider.
-->
<script lang="ts">
  import type { LoggerProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: LoggerProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ logger: provider }}>
    {@render children?.()}
  </Provided>
{/key}
