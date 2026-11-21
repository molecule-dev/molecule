<!--
  Provider for the code editor, as @molecule/app-react's EditorProvider.
-->
<script lang="ts">
  import type { EditorProviderProps } from '../types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: EditorProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ editor: provider }}>
    {@render children?.()}
  </Provided>
{/key}
