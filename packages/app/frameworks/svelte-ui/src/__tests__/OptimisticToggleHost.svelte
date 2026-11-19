<!--
  Test host for the optimistic toggle's prop-driven contracts. The test owns
  every input through a store (Svelte's idiom for the React test's `useState`
  and `rerender`): `value` drives a same-record refetch, `signedIn`/`self` the
  app-owned permission gate, `recordKey` React's `key` (the `{#key}` block
  destroys and recreates the button), and `mode` picks which contract is being
  exercised. The labels are props because each React case supplies its own.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import OptimisticToggleButton from '../components/OptimisticToggleButton.svelte'

  let {
    mode,
    value,
    signedIn,
    self,
    recordKey,
    commit,
    onError,
    activeLabel = 'Follow',
    inactiveLabel = 'Unfollow',
  }: {
    mode: 'value' | 'gate' | 'record' | 'disabled'
    value: Readable<boolean>
    signedIn: Readable<boolean>
    self: Readable<boolean>
    recordKey: Readable<string>
    commit: (desired: boolean) => Promise<boolean>
    onError?: (error: unknown) => void
    activeLabel?: string
    inactiveLabel?: string
  } = $props()
</script>

{#if mode === 'value'}
  <OptimisticToggleButton value={$value} {commit} {onError} {activeLabel} {inactiveLabel} />
{:else if mode === 'gate'}
  {#if $signedIn && !$self}
    <OptimisticToggleButton value={false} {commit} {onError} {activeLabel} {inactiveLabel} />
  {/if}
{:else if mode === 'record'}
  {#key $recordKey}
    <OptimisticToggleButton value={false} {commit} {onError} {activeLabel} {inactiveLabel} />
  {/key}
{:else}
  <OptimisticToggleButton value={false} {commit} {onError} {activeLabel} {inactiveLabel} disabled />
{/if}
