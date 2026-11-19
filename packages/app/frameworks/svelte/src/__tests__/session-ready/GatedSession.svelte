<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
  import SessionHeading from './SessionHeading.svelte'
</script>

<SessionReady>
  {#snippet fallback()}<p>Restoring</p>{/snippet}
  <SessionHeading />
</SessionReady>
