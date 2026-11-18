<!--
  Test host for the NotificationsPage unit tests: wires the mock HTTP client and
  a memory router through `setMoleculeContext`, then renders
  `<NotificationsPage>` — the composition root an app runs, so the page reads
  its services through the binding's hooks exactly as in production.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { HttpClient } from '@molecule/app-http'
  import type { Router } from '@molecule/app-routing'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import NotificationsPage from '../NotificationsPage.svelte'
  import type { NotificationsPageProps } from '../types.js'

  let {
    http,
    router,
    page = {},
  }: { http: HttpClient; router: Router; page?: NotificationsPageProps } = $props()

  // The services are fixed for the life of the mount, like the conformance
  // host's composition root.
  untrack(() => setMoleculeContext({ http, router }))
</script>

<NotificationsPage {...page} />
