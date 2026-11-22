<!--
  Test host for TabBar: sets the theme provider in Svelte context during
  component initialisation (the only place Svelte context is legal) and
  renders the bar with the props it was given. The React reference wraps its
  bar in a ThemeProvider the same way.
-->
<script lang="ts">
  import type { TabBarProps } from '@molecule/app-ide-panel-logic'
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import TabBar from '../components/TabBar.svelte'

  let { theme, ...rest }: TabBarProps & { theme: ThemeProvider } = $props()
  setThemeContext(theme)
</script>

<TabBar {...rest} />
