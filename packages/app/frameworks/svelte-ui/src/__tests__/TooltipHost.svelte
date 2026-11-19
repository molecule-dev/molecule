<!--
  Test host for the Tooltip rerender scenarios: `replace` drops an older
  tooltip instance after a newer one took over the tooltip owner, and
  `expand` swaps the visible tooltip's content (an asynchronously loaded
  body) while the tooltip stays open.
-->
<script lang="ts">
  import Tooltip from '../components/Tooltip.svelte'

  let { mode }: { mode: 'replace' | 'expand' } = $props()

  let first = $state(true)
  let content = $state('Loading')
</script>

{#if mode === 'replace'}
  <button type="button" data-action="remove-old" onclick={() => (first = false)}>remove</button>
  {#if first}
    <Tooltip content="Old help"><button type="button">Old</button></Tooltip>
  {/if}
  <Tooltip content="Current help"><button type="button">Current</button></Tooltip>
  <Tooltip content="Next help"><button type="button">Next</button></Tooltip>
{:else}
  <button
    type="button"
    data-action="expand"
    onclick={() => (content = 'Loaded context and allowance details')}>expand</button
  >
  <Tooltip {content}><button type="button">Context</button></Tooltip>
{/if}
