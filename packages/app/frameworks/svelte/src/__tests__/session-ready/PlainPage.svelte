<!--
  An ungated server shell: a page with no molecule context at all, so it renders
  on the server render and on the first client render alike. svelte-check reads a
  component with no `<script>` as an untyped module, so this one declares its
  (empty) props the way the other fixtures do.
-->
<script lang="ts">
  const _props: Record<string, never> = $props()
</script>

<p>Server page</p>
