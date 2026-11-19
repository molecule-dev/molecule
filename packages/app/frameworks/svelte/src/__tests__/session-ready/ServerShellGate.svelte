<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
</script>

<SessionReady>
  {#snippet fallback()}<p>Restoring</p>{/snippet}
  <p>Server page</p>
</SessionReady>
