<!--
  A component mounted with no `MoleculeRouterProvider` above it: the case asks for one
  bond hook and the bond must throw the error that names the provider to mount.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import {
    useIsActive,
    useMoleculeNavigate,
    useMoleculeQuery,
    useMoleculeRouter,
  } from '../index.js'

  let {
    hook,
  }: {
    hook: 'useMoleculeRouter' | 'useMoleculeQuery' | 'useMoleculeNavigate' | 'useIsActive'
  } = $props()

  // The case picks the hook once, at mount; `untrack` says that read is intentional.
  const selected = untrack(() => hook)

  if (selected === 'useMoleculeRouter') useMoleculeRouter()
  else if (selected === 'useMoleculeQuery') useMoleculeQuery()
  else if (selected === 'useMoleculeNavigate') useMoleculeNavigate()
  else useIsActive('/settings')
</script>

<p>outside</p>
