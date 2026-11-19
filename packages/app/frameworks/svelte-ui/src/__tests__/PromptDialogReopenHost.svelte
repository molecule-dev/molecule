<!--
  Test host for the PromptDialog reopening scenario: `open` and `initialValue`
  are readable stores (the caller's state in Svelte's idiom), so the test can
  close and reopen the dialog with a moved `initialValue`, exactly as the React
  reference re-renders it.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import PromptDialog from '../components/PromptDialog.svelte'

  let {
    open,
    initialValue,
    onClose,
    onSubmit,
    inputMolId,
  }: {
    open: Readable<boolean>
    initialValue: Readable<string>
    onClose: () => void
    onSubmit: (value: string) => void | Promise<void>
    inputMolId?: string
  } = $props()
</script>

<PromptDialog
  open={$open}
  initialValue={$initialValue}
  title="Rename board"
  placeholder="Board name"
  {onClose}
  {onSubmit}
  {inputMolId}
/>
