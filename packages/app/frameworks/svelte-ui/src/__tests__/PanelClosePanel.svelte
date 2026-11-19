<!--
  Panel content that dismisses its parent drawer through `usePanelClose`, the
  Svelte counterpart of the React test's `ClosingPanel`.
-->
<script lang="ts">
  import { usePanelClose } from '../panel-close.js'

  const close = usePanelClose()
</script>

<button type="button" onclick={close}>dismiss</button>
