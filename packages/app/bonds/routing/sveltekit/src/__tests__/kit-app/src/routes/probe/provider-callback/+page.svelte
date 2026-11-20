<script lang="ts">
  // A page that mounts the bond's provider itself with a callback the case changes: React's
  // `provider-lifecycle` re-rendered its provider with a new `onRouterReady`, and the
  // button here does the same. The root layout's provider still wraps the page.
  import type { Router } from '@molecule/app-routing'

  import { MoleculeRouterProvider } from '../../../../../../index.js'
  import { appNavigation, recordCallbackReady } from '../../../lib/probe.js'

  const navigation = appNavigation()

  /** The first callback: the one the provider is created with. */
  const first = (router: Router): void => recordCallbackReady('first', router)

  /** The second callback: the one a re-render would pass. */
  const second = (router: Router): void => recordCallbackReady('second', router)

  let which = $state<'first' | 'second'>('first')
</script>

<MoleculeRouterProvider {navigation} onRouterReady={which === 'first' ? first : second}>
  <button id="swap-callback" onclick={() => (which = 'second')}>Change callback</button>
</MoleculeRouterProvider>
