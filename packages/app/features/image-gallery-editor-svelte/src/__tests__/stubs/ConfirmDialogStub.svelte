<!--
  ConfirmDialogStub: shows the title while open and renders nothing when
  closed, the way the React suite's `@molecule/app-ui-react` ConfirmDialog
  stub does in its smoke and a11y tests.
-->
<script lang="ts">
  let { open, title }: { open?: boolean; title?: unknown } = $props()
</script>

{#if open}<div data-confirm-dialog="">{title ?? ''}</div>{/if}
