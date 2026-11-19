<!--
  React's `ProfileSummary`: the shared auth user as JSON, so a case can read what
  the client published.
-->
<script lang="ts">
  import { useAuth } from '../../hooks/useAuth.js'
  import type { Reader } from './profile-fixtures.js'

  const { user } = useAuth<Reader>()
</script>

<output aria-label="Shared profile">{JSON.stringify($user)}</output>
