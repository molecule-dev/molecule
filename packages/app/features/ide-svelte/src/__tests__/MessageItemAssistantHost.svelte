<!--
  Test host for MessageItem: sets the theme provider the tool-call cards read
  (Svelte context is legal only during component initialisation) and renders
  the part with the props it was given. The React reference wraps its part in
  a ThemeProvider the same way; the i18n provider is process-global.
-->
<script lang="ts">
  import { setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import MessageItem from '../parts/MessageItem.svelte'
  import type { MessageItemProps } from '../types.js'

  let { theme, ...rest }: MessageItemProps & { theme: ThemeProvider } = $props()

  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
</script>

<MessageItem {...rest} />
