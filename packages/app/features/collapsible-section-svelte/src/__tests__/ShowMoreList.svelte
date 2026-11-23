<!--
  Test host: renders `ShowMore` the way an app does — one entry of `items` per
  item, each rendered through the `children` snippet. `setItems` replaces the
  list after mount, the way an app's own state update does.
-->
<script lang="ts">
  import ShowMore from '../ShowMore.svelte'

  let {
    count = 0,
    initialCount,
    className,
  }: { count?: number; initialCount?: number; className?: string } = $props()

  let override = $state<number[] | null>(null)
  const items = $derived(override ?? Array.from({ length: count }, (_value, index) => index))

  /**
   * Replaces the items with a new list.
   *
   * @param next - The new item entries.
   */
  export function setItems(next: number[]): void {
    override = next
  }
</script>

<ShowMore {initialCount} {className} {items}>
  {#snippet children(index)}<div data-item={String(index)}>
      item-{index}
    </div>{/snippet}
</ShowMore>
