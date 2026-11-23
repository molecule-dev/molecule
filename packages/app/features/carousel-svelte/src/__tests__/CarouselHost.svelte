<!--
  Test host: renders `Carousel` the way an app does — one entry of `items` per
  slide, each rendered through the `children` snippet. `setSlides` replaces the
  list after mount, the way an app's own state update does.
-->
<script lang="ts">
  import Carousel from '../Carousel.svelte'

  let { props = {}, slides = 0 }: { props?: Record<string, unknown>; slides?: number } = $props()

  let override = $state<number[] | null>(null)
  const items = $derived(override ?? Array.from({ length: slides }, (_, i) => i))

  /**
   * Replaces the slides with a new list.
   *
   * @param next - The new slide entries.
   */
  export function setSlides(next: number[]): void {
    override = next
  }
</script>

<Carousel {...props} {items}>
  {#snippet children(i)}<div data-slide={i}>slide-{i}</div>{/snippet}
</Carousel>
