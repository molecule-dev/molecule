<!--
  Test fixture for the counted toggle of the Svelte listing card: the same
  card trees the React suite's `cards()` helper builds — a grid with one
  counted card and one plain card, or a single card with an optional counted
  toggle and a plain body title.
-->
<script lang="ts">
  import ListingCard from '../ListingCard.svelte'
  import ListingCardBody from '../ListingCardBody.svelte'
  import ListingGrid from '../ListingGrid.svelte'
  import type { ListingCardToggleProps } from '../types.js'

  let {
    grid = false,
    toggle,
    onClick,
    dataMolId,
    title = 'Repair station',
  }: {
    grid?: boolean
    toggle?: ListingCardToggleProps
    onClick?: (event: MouseEvent) => void
    dataMolId?: string
    title?: string
  } = $props()
</script>

{#if grid}<ListingGrid
    ><ListingCard {dataMolId} {onClick} {toggle}><ListingCardBody {title} /></ListingCard
    ><ListingCard><ListingCardBody title="Workshop map" /></ListingCard></ListingGrid
  >{:else}<ListingCard {toggle}><ListingCardBody {title} /></ListingCard>{/if}
