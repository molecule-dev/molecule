<!--
  Test host for the Alert announcement test: a re-render flips `live`, so the
  same banner moves from the assertive role="alert" to the polite role.
-->
<script lang="ts">
  import Alert from '../components/Alert.svelte'

  let live = $state(true)
</script>

<button type="button" data-toggle onclick={() => (live = !live)}>toggle</button>
<Alert {live}>Static banner</Alert>
