<!--
  Test host for the AccountSection unit tests: wires the real auth client and
  an http stub through `setMoleculeContext`, then renders `<AccountSection>` —
  the composition root an app runs, so the section reads its services through
  the binding's hooks exactly as in production.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { AuthClient } from '@molecule/app-auth'
  import type { HttpClient } from '@molecule/app-http'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import AccountSection from '../AccountSection.svelte'

  let { client, http }: { client: AuthClient<never>; http: HttpClient } = $props()

  // The services are fixed for the life of the mount, like the conformance
  // host's composition root.
  untrack(() => setMoleculeContext({ auth: client, http }))
</script>

<AccountSection />
