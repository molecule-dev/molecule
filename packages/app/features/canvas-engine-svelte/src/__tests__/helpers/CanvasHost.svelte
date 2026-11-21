<!--
  A test host: renders the canvas engine with props taken from a store, so a
  test can hand the SAME mounted component new props (React's `rerender`), and
  hands the component's imperative methods back through `slot.instance`
  (`bind:this`).
-->
<script lang="ts">
  import type { Writable } from 'svelte/store'

  import CanvasEngine from '../../CanvasEngine.svelte'
  import type { CanvasEngineHandle, CanvasEngineProps } from '../../types.js'

  let {
    values,
    slot,
  }: {
    values: Writable<CanvasEngineProps>
    slot: { instance?: CanvasEngineHandle }
  } = $props()

  let instance = $state<CanvasEngineHandle>()

  $effect(() => {
    slot.instance = instance
  })
</script>

<CanvasEngine {...$values} bind:this={instance} />
