<!--
  The authenticated shell summary, read from the same client every page uses.
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  interface AppUser extends UserProfile {
    username?: string
    bio?: string
  }

  const { user } = useAuth<AppUser>()
</script>

<p data-testid="profile-name">{$user?.name ?? 'anonymous'}</p>
