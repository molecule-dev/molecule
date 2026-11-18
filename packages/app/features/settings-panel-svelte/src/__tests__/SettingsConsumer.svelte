<!--
  The settings-panel context consumer for the container tests: reads the
  container's context, records it for the test's identity assertion, and
  calls the published handler on click.
-->
<script lang="ts">
  import { useSettingsPanelContext } from '../context.js'
  import { captured } from './context-capture.js'

  const context = useSettingsPanelContext()
  captured.context = context
</script>

<button type="button" onclick={() => context.onClose()}>close</button>
