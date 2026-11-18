<!--
  ConfirmDialogDescriptionStub: shows the title AND the description while open
  and renders nothing when closed, the way the React suite's
  `@molecule/app-ui-react` ConfirmDialog stub does in its drop-and-text tests.
-->
<script lang="ts">
  let { open, title, description }: { open?: boolean; title?: unknown; description?: unknown } =
    $props()
</script>

{#if open}<div data-confirm-dialog="">{title ?? ''} | {description ?? ''}</div>{/if}
