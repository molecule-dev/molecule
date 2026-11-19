<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  const { status, user } = useAuth<UserProfile>()
</script>

<h1>{$status === 'authenticated' ? `Signed in as ${$user?.name}` : 'Signed out'}</h1>
