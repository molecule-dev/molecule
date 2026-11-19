<!--
  React's `AccountEditor`: seeds a controlled input from the shared auth user at
  mount, so a remount shows whatever the client published.
-->
<script lang="ts">
  import { useAuth } from '../../hooks/useAuth.js'

  interface Account {
    memberKey: string
    displayName: string
    timezone: string
  }

  const { user } = useAuth<Account>()
  let name = $state($user?.displayName ?? '')
</script>

<input
  aria-label="Account name"
  value={name}
  oninput={(event) => (name = event.currentTarget.value)}
/>
