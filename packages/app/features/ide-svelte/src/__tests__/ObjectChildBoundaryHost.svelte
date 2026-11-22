<!--
  Test host for the boundary's object-child case: the item body is a real
  component whose markup renders an object, so the value reaches Svelte's text
  renderer exactly where React would throw on it.
-->
<script lang="ts">
  import ChatItemBoundary from '../parts/ChatItemBoundary.svelte'
  import type { ChatItemErrorInfo } from '../types.js'
  import ObjectChildItem from './ObjectChildItem.svelte'

  let { onError }: { onError?: (error: Error, info: ChatItemErrorInfo) => void } = $props()
</script>

{#snippet body()}<ObjectChildItem />{/snippet}

<ChatItemBoundary render={body} {onError} />
