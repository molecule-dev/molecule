<script lang="ts">
  import { SessionReady } from '../../session-ready/index.js'
  import FollowButton from './FollowButton.svelte'

  let { onFollow }: { onFollow: (by: string) => void } = $props()
</script>

<SessionReady>
  {#snippet fallback()}<p>Restoring</p>{/snippet}
  <FollowButton {onFollow} />
</SessionReady>
