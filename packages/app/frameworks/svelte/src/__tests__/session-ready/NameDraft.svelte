<!--
  React's `Name` field: an uncontrolled draft seeded once from the current user,
  so a later user update cannot overwrite what the person typed.
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  const { user } = useAuth<UserProfile>()
  let draft = $state($user?.name ?? '')
</script>

<input
  aria-label="Profile name"
  value={draft}
  oninput={(event) => (draft = event.currentTarget.value)}
/>
