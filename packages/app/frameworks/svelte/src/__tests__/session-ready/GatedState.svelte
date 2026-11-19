<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
  import SessionState from './SessionState.svelte'
</script>

<SessionReady>
  {#snippet fallback()}<p>Restoring</p>{/snippet}
  <SessionState />
</SessionReady>
