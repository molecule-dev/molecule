<script lang="ts">
  // The draft a shelf page seeds from its route parameter, React's `ShelfForm`
  // (`useState(params.shelf ?? '')`) in Svelte's idiom: the rune takes the initial
  // value once, as the hook's initial state does, and later navigation does not
  // reset it.
  import { page } from '$app/state'

  let title = $state(page.params.shelf ?? '')
</script>

<input aria-label="Shelf title" bind:value={title} />
