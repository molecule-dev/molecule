<!--
  The documented invoice page: the record's action mounts only with the
  document, and the missing and failed reads render alerts — the resource
  example the React tests execute. The action is the example's
  `OptimisticToggleButton`: the record's flag arrives as a reactive prop, so
  the mounted controller follows newer server values without a remount, and an
  inverse click during a pending save queues after it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { OptimisticToggleButton } from '@molecule/app-ui-svelte'

  import QueryContent from '../../QueryContent.svelte'
  import { useQuery } from '../../useQuery.js'
  import { invoices, VIEWER } from './resources.js'

  let { id }: { id: string } = $props()

  // The options are read once at init, like React's options read per render.
  const query = useQuery(untrack(() => invoices.detail(VIEWER, id)))
</script>

<QueryContent {query}>
  {#snippet pending()}
    <p role="status">Loading…</p>
  {/snippet}
  {#snippet missing()}
    <p role="alert">Invoice not found.</p>
  {/snippet}
  {#snippet error()}
    <p role="alert">Unable to load invoice.</p>
  {/snippet}
  {#snippet children(invoice)}
    <OptimisticToggleButton
      value={invoice.flagged}
      commit={async (on) => (await invoices.toggle(VIEWER, invoice.id, 'flag', on)).flagged}
      activeLabel="Unflag"
      inactiveLabel="Flag"
    />
  {/snippet}
</QueryContent>
