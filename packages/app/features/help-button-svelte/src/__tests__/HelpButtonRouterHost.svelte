<script lang="ts">
  import { untrack } from 'svelte'

  import type { Router } from '@molecule/app-routing'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import HelpButton from '../HelpButton.svelte'
  import type { HelpButtonProps } from '../types.js'

  let { router, button }: { router: Router; button: HelpButtonProps } = $props()

  untrack(() => setMoleculeContext({ router }))
</script>

<HelpButton {...button} />
