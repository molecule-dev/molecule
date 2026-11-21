<!--
  Test host for the StorefrontTopNav suites: installs the molecule context the
  nav's real `Link` needs to reach the router, then renders the nav with its
  typed props.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setMoleculeContext } from '@molecule/app-svelte'

  import StorefrontTopNav from '../StorefrontTopNav.svelte'
  import type { StorefrontTopNavProps } from '../types.js'

  let {
    config,
    props: navProps,
  }: {
    config: Parameters<typeof setMoleculeContext>[0]
    props: StorefrontTopNavProps
  } = $props()

  untrack(() => setMoleculeContext(config))
</script>

<StorefrontTopNav {...navProps} />
