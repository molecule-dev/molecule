<!--
  Test host for the i18n locale-bond test: sets the live-preview and i18n
  providers in Svelte context during component initialisation (the only place
  Svelte context is legal) so the panel resolves `t()` through the BONDED
  provider the test loads — the way React's test wraps the panel in its
  providers after bonding the global one.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { I18nProvider } from '@molecule/app-i18n'
  import type { PreviewProvider } from '@molecule/app-live-preview'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import PreviewPanel from '../components/PreviewPanel.svelte'
  import type { PreviewPanelProps } from '../types.js'

  let {
    preview,
    i18n,
    initial = {},
  }: { preview: PreviewProvider; i18n: I18nProvider; initial?: PreviewPanelProps } = $props()

  // The services are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => setMoleculeContext({ i18n, preview }))
</script>

<PreviewPanel {...initial} />
