<!-- A profile draft page held behind the default session gate. -->
<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
  import NameDraft from './NameDraft.svelte'
</script>

<SessionReady>
  {#snippet fallback()}<p>Restoring</p>{/snippet}
  <NameDraft />
</SessionReady>
