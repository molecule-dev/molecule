<!--
  Test host for WorkspaceLayout: sets the workspace and i18n services in
  Svelte context during component initialisation (the only place Svelte context
  is legal) and renders the layout with two panes — chat plus a combined main
  pane — the way the IDE does. `setPanes` replaces the pane list after mount, so
  a test can make a pane appear later.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { createSimpleI18nProvider } from '@molecule/app-i18n'
  import type { WorkspaceProvider } from '@molecule/app-ide'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import WorkspaceLayout from '../components/WorkspaceLayout.svelte'

  let { workspace, panes = ['chat', 'main'] }: { workspace: WorkspaceProvider; panes?: string[] } =
    $props()

  let override = $state<string[] | null>(null)
  const items = $derived(override ?? panes)

  /**
   * Replaces the pane list, as an app's own state update does.
   *
   * @param next - The new pane names, in row order.
   */
  export function setPanes(next: string[]): void {
    override = next
  }

  // The services are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => setMoleculeContext({ i18n: createSimpleI18nProvider('en'), workspace }))
</script>

<WorkspaceLayout {items}>
  {#snippet children(pane)}<div data-testid={`${pane}-pane`}>{pane}</div>{/snippet}
</WorkspaceLayout>
