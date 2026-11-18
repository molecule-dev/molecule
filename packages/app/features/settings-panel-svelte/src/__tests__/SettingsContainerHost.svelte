<!--
  Test host for the SettingsContainer tests: hands the container the current
  `onClose` prop (a reactive prop bag, so a test can set the prop again) and
  renders a node that changes with `tick`, which is how a test forces the
  parent to re-render (React's `rerender`).
-->
<script lang="ts">
  import SettingsContainer from '../SettingsContainer.svelte'
  import SettingsConsumer from './SettingsConsumer.svelte'

  let { onClose, tick = 0 }: { onClose: () => void; tick?: number } = $props()
</script>

<SettingsContainer {onClose}><SettingsConsumer /></SettingsContainer>
<span data-testid="tick">{tick}</span>
