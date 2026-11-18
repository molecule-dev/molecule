<!--
  Test host: renders `Carousel` the way an app does — the slides are the
  component's `children` snippet, so the unit tests mount a real snippet rather
  than raw HTML (a raw snippet renders one element, and the slide count is what
  the carousel reads from the rendered children).
-->
<script lang="ts">
  import Carousel from '../Carousel.svelte'

  let { props = {}, slides = 0 }: { props?: Record<string, unknown>; slides?: number } = $props()
</script>

<Carousel {...props}>
  {#each Array.from({ length: slides }, (_, i) => i) as i (i)}
    <div data-slide={i}>slide-{i}</div>
  {/each}
</Carousel>
