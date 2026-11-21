<!--
  Provider for theming, as @molecule/app-react's ThemeProvider.
-->
<script lang="ts">
  import type { ThemeProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: ThemeProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ theme: provider }}>
    {@render children?.()}
  </Provided>
{/key}
