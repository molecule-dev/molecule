<!--
  The Icon mock the unit tests substitute for `@molecule/app-ui-svelte`'s
  `Icon`: the same element the React tests' mock renders, carrying the glyph
  name where the assertions read it.
-->
<script lang="ts">
  let { name }: { name: string } = $props()
</script>

<svg data-icon={name}></svg>
