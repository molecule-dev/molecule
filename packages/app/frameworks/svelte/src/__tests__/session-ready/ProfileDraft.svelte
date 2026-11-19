<!-- React's `ProfileDraft`: a form field seeded from the current user's name. -->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  const { user } = useAuth<UserProfile>()
</script>

<input aria-label="Display name" value={$user?.name ?? ''} />
