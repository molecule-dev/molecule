<!--
  The page React's `credential-consumption` cases mount: it calls the bond's
  `useConsumedSearchParam('token')` during initialisation, exactly as an app's reset
  form does, and publishes the value and setter the case reads and drives. The hook
  connects on mount, so the credential the address carried is consumed and removed
  without the case calling anything.
-->
<script lang="ts">
  import { get } from 'svelte/store'

  import { useConsumedSearchParam } from '../../../../index.js'
  import { publishCredentialProbe } from './credential-probe.js'

  const consumed = useConsumedSearchParam('token')

  publishCredentialProbe({
    value: () => get(consumed)[0],
    set: (value: string) => get(consumed)[1](value),
  })
</script>
