<!--
  Test host: a keyed `{#each}` of carousels, so a test can put an empty
  carousel next to a filled one and insert a new carousel before it. An empty
  carousel renders no element at all (React returns `null`), which is what the
  Svelte port must leave Svelte's own block anchors free to represent.
-->
<script lang="ts">
  import Carousel from '../Carousel.svelte'

  /** One group in the keyed list: its id and its slide entries. */
  interface Group {
    id: string
    slides: number[]
  }

  let { groups = [] }: { groups?: Group[] } = $props()

  let override = $state<Group[] | null>(null)
  const list = $derived(override ?? groups)

  /**
   * Replaces the list, as an app's own state update does.
   *
   * @param next - The new groups, in order.
   */
  export function setGroups(next: Group[]): void {
    override = next
  }
</script>

<section data-host>
  {#each list as group (group.id)}
    <Carousel items={group.slides} showArrows={false} showDots={false}>
      {#snippet children(slide)}<div data-slide={slide}>slide-{slide}</div>{/snippet}
    </Carousel>
  {/each}
</section>
