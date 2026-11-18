<!--
  The `Avatar` stub: an inspectable <img> carrying the src and name the
  component passed, the same marker the React suite's stub renders.
-->
<script lang="ts">
  let { src, name }: { src?: string; name?: string } = $props()
</script>

<img data-avatar={src ?? ''} data-avatar-name={name ?? ''} alt="" />
