<!--
  Test host for PreviewPanel: sets the live-preview provider and i18n service
  in Svelte context during component initialisation (the only place Svelte
  context is legal) and spreads the panel's props, the way the IDE mounts it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { createSimpleI18nProvider } from '@molecule/app-i18n'
  import type { PreviewProvider } from '@molecule/app-live-preview'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import type { PreviewPanelProps } from '../components/PreviewPanel.svelte'
  import PreviewPanel from '../components/PreviewPanel.svelte'

  let { preview, ...rest }: PreviewPanelProps & { preview: PreviewProvider } = $props()

  // The services are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => setMoleculeContext({ i18n: createSimpleI18nProvider('en'), preview }))
</script>

<PreviewPanel {...rest} />
