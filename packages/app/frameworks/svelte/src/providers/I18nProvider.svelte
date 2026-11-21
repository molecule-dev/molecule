<!--
  Provider for internationalization, as @molecule/app-react's I18nProvider.
-->
<script lang="ts">
  import type { I18nProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: I18nProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ i18n: provider }}>
    {@render children?.()}
  </Provided>
{/key}
