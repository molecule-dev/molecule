<!--
  A test host rendering `<ShowMore>` with a real item list: the React suite
  passes `children` as an array of elements, and a Svelte caller fills the same
  prop with a snippet — this component is that caller.
-->
<script lang="ts">
  import ShowMore from '../ShowMore.svelte'

  let {
    count = 5,
    initialCount = 3,
    className,
  }: { count?: number; initialCount?: number; className?: string } = $props()
</script>

<ShowMore {initialCount} {className}>
  {#each Array.from({ length: count }, (_value, index) => index) as index (index)}<div
      data-item={String(index)}
    >
      item-{index}
    </div>{/each}
</ShowMore>
