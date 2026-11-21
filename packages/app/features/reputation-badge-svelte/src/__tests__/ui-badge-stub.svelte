<!--
  A stand-in for `@molecule/app-ui-svelte`'s `Badge` in the unit tests: renders
  the color it was given on a marked `<span>`, so a test can assert which tier
  color the feature asked for — the same stub the React package's own tests use.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, color }: { children?: Snippet; color?: string } = $props()
</script>

<span data-testid="badge" data-color={color}>{@render children?.()}</span>
