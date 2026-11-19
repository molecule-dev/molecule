<!--
  Test probe that paints `useIsDesktop()`'s current value — the Svelte
  counterpart of React Testing Library's `renderHook` result in the
  `useIsDesktop` tests.
-->
<script lang="ts">
  import { useIsDesktop } from '../hooks.js'

  const isDesktop = useIsDesktop()
</script>

<span data-mol-id="is-desktop">{$isDesktop}</span>
