<!-- Avatar stub for the unit tests: an inspectable <img> carrying the supplied
  src, the same marker the React suite's `@molecule/app-ui-react` stub renders. -->
<script lang="ts">
  let { src, name }: { src?: string; name?: string } = $props()
</script>

<img alt="" data-avatar={src ?? ''} data-avatar-name={name ?? ''} />
