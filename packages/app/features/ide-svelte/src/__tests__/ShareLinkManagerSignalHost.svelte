<!--
  Test host for the ShareLinkManager refresh-signal test: sets the theme and
  HTTP providers in Svelte context during component initialisation (the only
  place Svelte context is legal) and renders the manager from a props object the
  test can replace, the way React's `rerender` bumps `refreshSignal`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext, setThemeContext, type ThemeProvider } from '@molecule/app-svelte'

  import ShareLinkManager, {
    type ShareLinkManagerProps,
  } from '../components/ShareLinkManager.svelte'

  let {
    theme,
    http,
    initial,
  }: { theme: ThemeProvider; http: HttpClient; initial: ShareLinkManagerProps } = $props()

  // The manager's current props (a test replaces them wholesale).
  let managerProps = $state<ShareLinkManagerProps>({ ...untrack(() => initial) })

  untrack(() => {
    setThemeContext(theme)
    setHttpContext(http)
  })

  /**
   * Replaces the manager's props (the host re-rendered with new values).
   *
   * @param next - The manager's new props.
   */
  export function setProps(next: ShareLinkManagerProps): void {
    managerProps = next
  }
</script>

<ShareLinkManager {...managerProps} />
