<!--
  Test host for WorkspaceLayout: sets the workspace and i18n services in
  Svelte context during component initialisation (the only place Svelte context
  is legal) and renders the layout with two panes — chat plus a combined main
  pane — the way the IDE does.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { createSimpleI18nProvider } from '@molecule/app-i18n'
  import type { WorkspaceProvider } from '@molecule/app-ide'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import WorkspaceLayout from '../components/WorkspaceLayout.svelte'

  let { workspace }: { workspace: WorkspaceProvider } = $props()
  // The services are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => setMoleculeContext({ i18n: createSimpleI18nProvider('en'), workspace }))
</script>

<WorkspaceLayout>
  <div data-testid="chat-pane">chat</div>
  <div data-testid="main-pane">main</div>
</WorkspaceLayout>
