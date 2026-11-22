<!--
  Test host for ShareLinkManager: sets the theme and http providers in Svelte
  context during component initialisation (the only place Svelte context is
  legal) and renders the manager with the props it was given. The React
  reference wraps its manager in a ThemeProvider + HttpProvider the same way.
-->
<script lang="ts">
  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext, setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import ShareLinkManager, {
    type ShareLinkManagerProps,
  } from '../components/ShareLinkManager.svelte'

  let { theme, http, ...rest }: ShareLinkManagerProps & { theme: ThemeProvider; http: HttpClient } =
    $props()
  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
  // svelte-ignore state_referenced_locally
  setHttpContext(http)
</script>

<ShareLinkManager {...rest} />
