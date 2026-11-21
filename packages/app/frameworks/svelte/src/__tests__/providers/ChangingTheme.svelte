<!--
  A MoleculeProvider whose theme and child label the test can change after mounting
  (`swapTheme`, `relabel`), to check what reaches the tree and what stays mounted.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { MoleculeProvider } from '../../providers/index.js'
  import type { MoleculeConfig } from '../../types.js'
  import Probe from './Probe.svelte'

  let { initial, read }: { initial: NonNullable<MoleculeConfig['theme']>; read: () => string } =
    $props()

  // The props are the starting values; the test changes them through the exports below.
  let theme = $state.raw(untrack(() => initial))
  let label = $state('first')

  /**
   * Gives the provider another theme service.
   *
   * @param next - The new service.
   */
  export function swapTheme(next: NonNullable<MoleculeConfig['theme']>): void {
    theme = next
  }

  /**
   * Changes the input's label, a change that is not a service.
   *
   * @param next - The new label.
   */
  export function relabel(next: string): void {
    label = next
  }
</script>

<MoleculeProvider {theme}>
  <Probe {read} />
  <input aria-label={label} />
</MoleculeProvider>
