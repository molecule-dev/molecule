<!-- A first action held behind the default session gate, with no fallback. -->
<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
  import InventoryAction from './InventoryAction.svelte'

  let { changed }: { changed: (by: string) => void } = $props()
</script>

<SessionReady>
  <InventoryAction {changed} />
</SessionReady>
