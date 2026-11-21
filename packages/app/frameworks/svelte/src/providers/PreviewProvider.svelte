<!--
  Provider for the live preview, as @molecule/app-react's PreviewProvider.
-->
<script lang="ts">
  import type { PreviewProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: PreviewProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ preview: provider }}>
    {@render children?.()}
  </Provided>
{/key}
