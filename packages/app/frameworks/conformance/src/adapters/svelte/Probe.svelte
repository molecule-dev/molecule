<!--
  A button that calls one of the export map's hooks (see ProbeSpec). The hook
  is called during component init, where Svelte context is available; a value
  hook returns a store.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { fromStore, type Readable } from 'svelte/store'

  import { callProbe, type ProbeSpec, probeValue } from '../../ui/index.js'

  let {
    spec,
    exports: exportsOf,
  }: {
    spec: ProbeSpec
    /** Every component and composable the cases may render or call. */
    exports: Record<string, unknown>
  } = $props()

  // The probe (and the export map it calls into) is fixed for the case's whole run.
  const fixed = untrack(() => spec)
  const map = untrack(() => exportsOf)
  const result = (map[fixed.probe] as () => unknown)()
  const isStore = (v: unknown): v is Readable<unknown> =>
    typeof v === 'object' && v !== null && typeof (v as Readable<unknown>).subscribe === 'function'
  const reader = fixed.value && isStore(result) ? fromStore(result) : { current: result }
</script>

<button
  type="button"
  data-parity-probe={fixed.label}
  data-parity-value={probeValue(fixed, reader.current)}
  onclick={() => callProbe(fixed, result)}>{fixed.label}</button
>
