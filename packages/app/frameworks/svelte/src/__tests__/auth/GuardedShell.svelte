<!--
  React's `GuardedShell`: a route shell waits only while the initial session
  decision is unknown.
-->
<script lang="ts">
  import { useAuth } from '../../hooks/useAuth.js'
  import LoginPage from './LoginPage.svelte'

  const { status, user } = useAuth<{ id: string; email: string }>()
</script>

{#if $status === 'loading'}
  <p role="status">Restoring session</p>
{:else if $status === 'authenticated'}
  <h1>Signed in as {$user?.email}</h1>
{:else}
  <LoginPage />
{/if}
