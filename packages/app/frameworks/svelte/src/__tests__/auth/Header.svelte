<!--
  React's `Header`: signed-out links, or the signed-in name plus the local
  sign-out sequence (`setAccessToken(null)` then `setUser(null)`).
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuthClient } from '../../context.js'
  import { useAuth } from '../../hooks/useAuth.js'

  const { isAuthenticated, status, setUser, user } = useAuth<UserProfile>()
  const client = useAuthClient<UserProfile>()
</script>

{#if !$isAuthenticated}
  <a href="/login">Sign in</a>
  <output aria-label="Auth status">{$status}</output>
{:else}
  <span>Signed in as {$user?.name}</span>
  <button
    type="button"
    onclick={() => {
      client.setAccessToken(null)
      setUser(null)
    }}
  >
    Sign out
  </button>
  <output aria-label="Auth status">{$status}</output>
{/if}
