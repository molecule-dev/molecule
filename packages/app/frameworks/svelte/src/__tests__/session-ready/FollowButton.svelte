<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  let { onFollow }: { onFollow: (by: string) => void } = $props()
  const { user } = useAuth<UserProfile>()
</script>

<button
  type="button"
  onclick={() => {
    if (!$user) return
    onFollow($user.id)
  }}>Follow</button
>
