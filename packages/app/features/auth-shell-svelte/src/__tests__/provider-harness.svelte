<!--
  A component that renders an `<AuthFormStateProvider>` around a hook harness, so
  the unit test can read the shared state from a descendant through context.
-->
<script lang="ts">
  import type { StorageProvider } from '@molecule/app-storage'

  import AuthFormStateProvider from '../AuthFormStateProvider.svelte'
  import HookHarness from './hook-harness.svelte'

  let { run, storage }: { run: () => void; storage?: StorageProvider } = $props()
</script>

<AuthFormStateProvider {storage} storageKey="ctx">
  <HookHarness {run} />
</AuthFormStateProvider>
