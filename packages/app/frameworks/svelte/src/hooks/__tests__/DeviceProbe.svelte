<!--
  A component that calls `useDevice()` during init and re-renders on its own
  button: the counterpart of React's `renderHook` rerender for a hook whose
  Svelte form is a plain object made once per component instance.
-->
<script lang="ts">
  import type { UseDeviceResult } from '../useDevice.js'
  import { useDevice } from '../useDevice.js'

  let { onRead }: { onRead: (result: UseDeviceResult) => void } = $props()

  const device = useDevice()
  let updates = $state(0)

  $effect(() => {
    // Re-runs after every update and hands over the component's own result.
    void updates
    onRead(device)
  })
</script>

<button type="button" onclick={() => (updates += 1)}>
  {device.language}:{updates}
</button>
