<!--
  Test host for the Toast default-duration test: every `bump` re-render hands
  the Toast a FRESH `onDismiss` closure, exactly like `ToastProvider`
  recreating each toast's callback on a provider re-render. The 5000ms default
  countdown must survive those re-renders.
-->
<script lang="ts">
  import Toast from '../components/Toast.svelte'

  let { onDismiss = () => {} }: { onDismiss?: () => void } = $props()

  let bump = $state(0)

  /**
   * Builds a new dismissal callback per render, tagging it with the render
   * number so a fresh identity is handed down on every bump.
   *
   * @param render - The current render count.
   * @returns A dismissal callback for this render.
   */
  const makeDismiss =
    (render: number): (() => void) =>
    () => {
      void render
      onDismiss()
    }
</script>

<button type="button" data-bump onclick={() => (bump += 1)}>bump</button>
<Toast title="Saved" onDismiss={makeDismiss(bump)} />
