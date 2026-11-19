<!--
  A nav child that closes the enclosing popover when clicked, the Svelte
  counterpart of the React test's `ClosingLink` (which calls
  `useUserMenuPopoverClose()`).
-->
<script lang="ts">
  import { useUserMenuPopoverClose } from '../user-menu-popover.svelte.js'

  const close = useUserMenuPopoverClose()
</script>

<button type="button" onclick={close}>go</button>
