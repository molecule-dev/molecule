<!--
  Test host for the UserMenu composition case: installs the molecule context
  (router and i18n providers) the composed header needs, then renders it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setMoleculeContext } from '@molecule/app-svelte'

  import UserMenuHeader from './UserMenuHeader.svelte'

  let { config }: { config: Parameters<typeof setMoleculeContext>[0] } = $props()

  untrack(() => setMoleculeContext(config))
</script>

<UserMenuHeader />
