<script lang="ts">
  // A layout route: kit gives it the matched child page as `children`, where React's layout
  // route renders `<RoutedView />`.
  import type { Snippet } from 'svelte'

  const { children }: { children: Snippet } = $props()
</script>

<main data-layout="">{@render children()}</main>
