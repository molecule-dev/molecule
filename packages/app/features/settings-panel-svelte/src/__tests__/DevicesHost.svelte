<!--
  Test host for the DevicesSection tests: provides the HTTP client through
  `setHttpContext`, the way an app's composition root does, then renders
  `<DevicesSection>`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext } from '@molecule/app-svelte'

  import DevicesSection from '../DevicesSection.svelte'

  let { http }: { http: HttpClient } = $props()

  // The client is fixed for the life of the mount.
  untrack(() => setHttpContext(http))
</script>

<DevicesSection />
