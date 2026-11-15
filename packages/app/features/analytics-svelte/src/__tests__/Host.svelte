<!--
  Test host: provides the molecule context (the test's memory router), then
  renders the component under test.
-->
<script lang="ts">
  import { type Component, untrack } from 'svelte'

  import type { Router } from '@molecule/app-routing'
  import { setMoleculeContext } from '@molecule/app-svelte'

  let { router, component: Target }: { router: Router; component: Component } = $props()

  // The context is registered once, at mount, from the router the host receives.
  untrack(() => setMoleculeContext({ router }))
</script>

<Target />
