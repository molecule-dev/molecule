<!--
  Test host for the declared-props port: a `ToastProvider` whose child probe
  hands the test the `useToast()` context. Svelte context is only readable
  during component initialization, so the probe must be a real child component
  rather than a snippet.
-->
<script lang="ts">
  import ToastProvider from '../components/ToastProvider.svelte'
  import type { ToastContextValue } from '../toast.js'
  import DeclaredPropsToastProbe from './DeclaredPropsToastProbe.svelte'

  let { capture }: { capture: (api: ToastContextValue) => void } = $props()
</script>

<ToastProvider>
  <DeclaredPropsToastProbe {capture} />
</ToastProvider>
