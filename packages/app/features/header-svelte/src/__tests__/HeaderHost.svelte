<!--
  Test host for the AppHeader suite: installs the molecule context (router,
  theme and i18n providers), then renders the header with its typed props.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setMoleculeContext } from '@molecule/app-svelte'

  import AppHeader from '../AppHeader.svelte'
  import type { AppHeaderProps } from '../types.js'

  let {
    config,
    props: headerProps,
  }: {
    config: Parameters<typeof setMoleculeContext>[0]
    props: AppHeaderProps
  } = $props()

  untrack(() => setMoleculeContext(config))
</script>

<AppHeader {...headerProps} />
