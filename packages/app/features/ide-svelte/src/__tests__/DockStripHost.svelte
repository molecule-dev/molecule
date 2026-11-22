<!--
  Test host for DockStrip: provides the work tray's context (header and
  detail elements already in the document, nothing open) when asked, and an
  action button like the React reference test's, then renders the strip with
  the props it was given.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import type { DockStripProps, WorkTrayValue } from '../parts/DockStrip.svelte'
  import DockStrip, { WorkTrayContext } from '../parts/DockStrip.svelte'

  let {
    tray = false,
    withAction = false,
    ...rest
  }: DockStripProps & { tray?: boolean; withAction?: boolean } = $props()

  // The context is set ONCE at init (the only place Svelte context is legal);
  // the prop never changes for this host's lifetime.
  // svelte-ignore state_referenced_locally
  if (tray) {
    const headerEl = document.createElement('div')
    const detailEl = document.createElement('div')
    document.body.appendChild(headerEl)
    document.body.appendChild(detailEl)
    const value: WorkTrayValue = $state({ headerEl, detailEl, openId: null, toggle: () => {} })
    setContext(WorkTrayContext, value)
  }
</script>

{#snippet commitAction()}
  <button type="button">Commit 2 files</button>
{/snippet}

<DockStrip actions={withAction ? commitAction : undefined} {...rest} />
