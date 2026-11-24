<!--
  A FilterPill whose panel content is an empty list (an each block over no rows), a list of
  nothing (an empty expression), or two rows.
-->
<script lang="ts">
  import FilterPill from '../FilterPill.svelte'

  let { content }: { content: 'empty' | 'nothing' | 'rows' } = $props()
  const rows = $derived(content === 'rows' ? ['One', 'Two'] : [])
</script>

<FilterPill label="Price"
  >{#each rows as row (row)}<span>{row}</span
    >{/each}{#if content === 'nothing'}{null}{/if}</FilterPill
>
