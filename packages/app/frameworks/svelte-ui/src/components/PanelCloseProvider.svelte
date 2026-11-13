<!--
  PanelCloseProvider: provides the panel-close callback to descendants.
  Rendered internally by UserMenu and SidebarUserCard around their
  children; apps do not normally render this directly. The value is a
  getter so a re-rendered close callback is always the one consumers call.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import { PANEL_CLOSE_CONTEXT, type PanelCloseContext } from '../panel-close.js'
  import type { PanelCloseProviderProps } from '../types.js'

  let { close, children }: PanelCloseProviderProps = $props()

  setContext<PanelCloseContext>(PANEL_CLOSE_CONTEXT, {
    get close() {
      return close
    },
  })
</script>

{@render children?.()}
