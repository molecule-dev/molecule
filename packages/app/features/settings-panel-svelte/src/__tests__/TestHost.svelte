<!--
  Test host for the AccountSection unit tests: provides the real auth client and an
  http stub through the binding's MoleculeProvider, then renders `<AccountSection>` —
  the composition root an app runs, so the section reads its services through the
  binding's hooks exactly as in production.
-->
<script lang="ts">
  import type { AuthClient, UserProfile } from '@molecule/app-auth'
  import type { HttpClient } from '@molecule/app-http'
  import { MoleculeProvider } from '@molecule/app-svelte'

  import AccountSection from '../AccountSection.svelte'

  let { client, http }: { client: AuthClient<UserProfile>; http: HttpClient } = $props()
</script>

<MoleculeProvider auth={client} {http}>
  <AccountSection />
</MoleculeProvider>
