<!--
  React's `LibraryPage`: a public page and a signed-in section making the
  documented three-way decision, rendered while a session restore is in flight.
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  const { status, user: currentUser } = useAuth<UserProfile>()
</script>

<h1>Public library</h1>
<output data-testid="session-status">{$status}</output>
<section>
  {#if $status === 'loading'}
    Restoring session
  {:else if $status === 'unauthenticated'}
    Redirect to sign in
  {:else}
    Signed in as {$currentUser?.name}
  {/if}
</section>
