<!--
  Test host: a QuickSearchDialog whose `open` the test toggles, mounted with a
  real molecule context (the i18n provider the kit's `t` reads).
-->
<script lang="ts">
  import type { ClientSearchDocument } from '@molecule/app-client-search'
  import { type MoleculeConfig, setMoleculeContext } from '@molecule/app-svelte'

  import QuickSearchDialog from '../QuickSearchDialog.svelte'
  import type { QuickSearchDialogProps } from '../types.js'

  let {
    config,
    dialog,
  }: {
    config: MoleculeConfig
    dialog: Omit<QuickSearchDialogProps<ClientSearchDocument>, 'open' | 'onClose'>
  } = $props()
  let open = $state(true)

  /** Opens or closes the dialog from the test. */
  export function setOpen(v: boolean): void {
    open = v
  }

  // svelte-ignore state_referenced_locally
  setMoleculeContext(config)
</script>

<QuickSearchDialog {...dialog} {open} onClose={() => (open = false)} />
