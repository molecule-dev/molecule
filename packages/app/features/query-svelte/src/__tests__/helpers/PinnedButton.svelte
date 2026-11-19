<!-- The record action's own state: a click pins the record it is mounted for. -->
<script lang="ts">
  let { id }: { id: string | number | undefined } = $props()
  let pinned = $state(false)
</script>

<button type="button" onclick={() => (pinned = true)}>{id}: {String(pinned)}</button>
