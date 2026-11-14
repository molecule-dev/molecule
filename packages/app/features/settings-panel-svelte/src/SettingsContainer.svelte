<!--
  SettingsContainer: the outer settings-panel layout — a padded vertical
  stack that hosts the section sub-components. Publishes `onClose` to
  descendants through Svelte context so LogOutDeleteSection etc. can dismiss
  the panel after an action without explicit prop threading.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { SettingsPanelContext } from './context.js'
  import type { SettingsContainerProps } from './types.js'

  let { onClose, children }: SettingsContainerProps = $props()

  const cm = $derived(getClassMap())

  // The context value follows the current prop, as React's `useMemo(() => ({
  // onClose }), [onClose])` re-creates the value on a re-render; the closure
  // reads the prop lazily instead of capturing its initial value.
  setContext(SettingsPanelContext, { onClose: () => onClose() })
</script>

<div class={cm.cn(cm.sp('p', 6), cm.stack(6))}>
  {@render children?.()}
</div>
