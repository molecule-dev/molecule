<!-- A profile field seeded by the restored user behind the default session gate. -->
<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
  import ProfileDraft from './ProfileDraft.svelte'
</script>

<SessionReady>
  {#snippet fallback()}<p>Restoring profile</p>{/snippet}
  <ProfileDraft />
</SessionReady>
