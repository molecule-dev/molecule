<!--
  A component that calls `usePlatform()` during init and re-renders on its own
  button: the counterpart of React's `renderHook` rerender for a hook whose
  Svelte form is a plain object made once per component instance.
-->
<script lang="ts">
  import type { UsePlatformResult } from '../usePlatform.js'
  import { usePlatform } from '../usePlatform.js'

  let { onRead }: { onRead: (result: UsePlatformResult) => void } = $props()

  const info = usePlatform()
  let updates = $state(0)

  $effect(() => {
    // Re-runs after every update and hands over the component's own result.
    void updates
    onRead(info)
  })
</script>

<button type="button" onclick={() => (updates += 1)}>
  {info.platform}:{updates}
</button>
