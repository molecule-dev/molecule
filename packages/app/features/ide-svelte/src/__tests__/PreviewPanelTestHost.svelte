<!--
  Test host for the ported PreviewPanel behaviour tests: sets the live-preview
  provider and i18n service in Svelte context during component initialisation
  (the only place Svelte context is legal) and renders the panel from a props
  object a test can REPLACE, the way React's `rerender` hands the panel new
  props. The services stay fixed for the whole mount.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { createSimpleI18nProvider } from '@molecule/app-i18n'
  import type { PreviewProvider } from '@molecule/app-live-preview'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import PreviewPanel from '../components/PreviewPanel.svelte'
  import type { PreviewPanelProps } from '../types.js'

  let { preview, initial = {} }: { preview: PreviewProvider; initial?: PreviewPanelProps } =
    $props()

  // The panel's current props. A test replaces the whole object (React's
  // `rerender` passes a new props object too), which re-renders the panel.
  let panelProps = $state<PreviewPanelProps>({ ...untrack(() => initial) })

  // The services are fixed for the whole mount; untrack records that the host
  // reads them once, the way the conformance kit's own host does.
  untrack(() => setMoleculeContext({ i18n: createSimpleI18nProvider('en'), preview }))

  /**
   * Replaces the panel's props (the host re-rendered with new values).
   *
   * @param next - The panel's new props.
   */
  export function setProps(next: PreviewPanelProps): void {
    panelProps = next
  }
</script>

<PreviewPanel {...panelProps} />
