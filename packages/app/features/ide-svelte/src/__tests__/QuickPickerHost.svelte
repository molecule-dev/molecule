<!--
  Test host for QuickPicker: sets the theme provider in Svelte context during
  component initialisation (the only place Svelte context is legal) and renders
  the picker with the props it was given. The React reference wraps its picker
  in a ThemeProvider the same way.
-->
<script lang="ts">
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import QuickPicker, { type QuickPickerProps } from '../components/QuickPicker.svelte'

  let { theme, ...rest }: QuickPickerProps & { theme: ThemeProvider } = $props()
  setThemeContext(theme)
</script>

<QuickPicker {...rest} />
