<script lang="ts">
  // A provider inside the root layout's, over the same navigation, as React's case nests one
  // provider in another.
  import type { Router } from '@molecule/app-routing'

  import { MoleculeRouterProvider } from '../../../../../../index.js'
  import { bindingProbe } from '../../../lib/binding-probe.js'
  import { appNavigation } from '../../../lib/probe.js'

  const probe = bindingProbe()
  const navigation = appNavigation()

  /**
   * Records the router the inner provider hands over.
   *
   * @param router - The router `onRouterReady` received.
   */
  const ready = (router: Router): void => {
    probe.innerReady.push(router)
  }
</script>

<MoleculeRouterProvider {navigation} routes={probe.innerRoutes} onRouterReady={ready}>
  <p>inner</p>
</MoleculeRouterProvider>
