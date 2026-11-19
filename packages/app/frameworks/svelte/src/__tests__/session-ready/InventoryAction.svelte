<!--
  React's `InventoryAction`: a signed-in action that bails out unless the
  session is authenticated, the handler shape a first click must not lose.
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  let { changed }: { changed: (by: string) => void } = $props()
  const { status, user } = useAuth<UserProfile>()
</script>

<button
  type="button"
  onclick={() => {
    if ($status !== 'authenticated' || !$user) return
    changed($user.id)
  }}>Reserve stock</button
>
