<!--
  A button that calls one of the UI package's hooks (see ProbeSpec). The hook
  is called during component init, where Svelte context is available; a value
  hook returns a store.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { fromStore, type Readable } from 'svelte/store'

  import { callProbe, type ProbeSpec, probeValue } from '@molecule/app-framework-conformance/ui'

  import * as SvelteUI from '../../index.js'

  let { spec }: { spec: ProbeSpec } = $props()

  const exportsOf = SvelteUI as unknown as Record<string, unknown>
  // The probe is fixed for the case's whole run.
  const fixed = untrack(() => spec)
  const result = (exportsOf[fixed.probe] as () => unknown)()
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
