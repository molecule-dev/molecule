<!--
  CONTROL: a guard that remounts the page whenever a request starts — Svelte's
  `{#key}` block destroys and recreates the child exactly as React's changed
  `key` does.
-->
<script lang="ts">
  import { useAuth } from '../../hooks/useAuth.js'
  import LoginPage from './LoginPage.svelte'

  const { isLoading } = useAuth()
</script>

{#key $isLoading}
  <LoginPage />
{/key}
