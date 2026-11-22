<!--
  A chat timeline item whose body renders a non-primitive value as its child —
  the Svelte counterpart of React's "object rendered as a React child"
  (React error #31, the 2026-08-14 failure). Used only by the boundary test.
-->
<script lang="ts">
  const notAString: Record<string, string> = { label: 'Recipe box' }
</script>

<span>{notAString}</span>
