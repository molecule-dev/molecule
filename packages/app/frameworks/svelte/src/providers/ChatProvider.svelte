<!--
  Provider for AI chat, as @molecule/app-react's ChatProvider.
-->
<script lang="ts">
  import type { ChatProviderProps } from '../chat-types.js'
  import Provided from './Provided.svelte'

  let { provider, children }: ChatProviderProps = $props()
</script>

{#key provider}
  <Provided services={{ chat: provider }}>
    {@render children?.()}
  </Provided>
{/key}
