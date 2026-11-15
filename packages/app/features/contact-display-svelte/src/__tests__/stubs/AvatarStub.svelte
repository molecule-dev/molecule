<!--
  Test stub for the Svelte Avatar UI component: the same `<img data-avatar
  data-avatar-name>` the React unit tests install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  let { src, name }: { src?: string; name?: string } = $props()
</script>

<img data-avatar={src ?? ''} data-avatar-name={name ?? ''} />
