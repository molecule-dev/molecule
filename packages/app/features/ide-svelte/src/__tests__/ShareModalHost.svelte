<!--
  Test host for ShareModal: sets the theme and http providers in Svelte
  context during component initialisation (the only place Svelte context is
  legal) and renders the modal with the props it was given — including an
  optional host-content snippet. The React reference wraps its modal in a
  ThemeProvider + HttpProvider the same way.
-->
<script lang="ts">
  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext, setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import ShareModal, { type ShareModalProps } from '../components/ShareModal.svelte'

  let {
    theme,
    http,
    children,
    ...rest
  }: ShareModalProps & { theme: ThemeProvider; http: HttpClient } = $props()
  // svelte-ignore state_referenced_locally
  setThemeContext(theme)
  // svelte-ignore state_referenced_locally
  setHttpContext(http)
</script>

<ShareModal {...rest} {children} />
