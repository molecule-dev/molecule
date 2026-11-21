<!--
  Provider for the HTTP client, as @molecule/app-react's HttpProvider.
-->
<script lang="ts">
  import type { HttpProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { client, children }: HttpProviderProps = $props()
</script>

{#key client}
  <Provided services={{ http: client }}>
    {@render children?.()}
  </Provided>
{/key}
