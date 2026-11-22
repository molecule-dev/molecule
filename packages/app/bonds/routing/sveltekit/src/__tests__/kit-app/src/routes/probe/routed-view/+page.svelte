<script lang="ts">
  // `@molecule/app-svelte`'s `RoutedView` under this bond, which provides no routed view: kit
  // gives a layout its page as `children`. The boundary keeps the rest of the app rendering;
  // kit's `handleError` (`src/hooks.client.ts`) records the error `RoutedView` threw.
  import { RoutedView } from '@molecule/app-svelte'
</script>

<svelte:boundary>
  <RoutedView />
  {#snippet failed()}
    <p>no routed view</p>
  {/snippet}
</svelte:boundary>
