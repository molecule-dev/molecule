<!--
  Test host for the Switch color/size test: a re-render with different
  color/size props must reach `switchBase`.
-->
<script lang="ts">
  import Switch from '../components/Switch.svelte'

  let success = $state(true)
</script>

<button type="button" data-toggle onclick={() => (success = !success)}>toggle</button>
<Switch label="Notify" checked color={success ? 'success' : 'error'} size={success ? 'lg' : 'sm'} />
