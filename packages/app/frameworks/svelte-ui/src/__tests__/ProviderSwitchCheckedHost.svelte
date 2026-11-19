<!--
  Test host for the Switch aria-checked test: one Switch instance starts with
  `checked` undefined (the uncontrolled case) and a re-render passes `true`,
  so the attribute must follow the prop rather than being fixed at mount.
-->
<script lang="ts">
  import Switch from '../components/Switch.svelte'

  let on = $state(false)
</script>

<button type="button" data-toggle onclick={() => (on = !on)}>toggle</button>
<Switch label="Notifications" checked={on ? true : undefined} />
