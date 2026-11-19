<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  const { status, user } = useAuth<UserProfile>()
</script>

<p data-testid="state">{$status}:{$user?.id ?? 'null'}</p>
