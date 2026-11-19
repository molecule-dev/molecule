<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
  import FallbackWithTheme from './FallbackWithTheme.svelte'
</script>

<SessionReady>
  {#snippet fallback()}<FallbackWithTheme />{/snippet}
  <p>Public page</p>
</SessionReady>
