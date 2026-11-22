<!--
  Test host for the QuickOpen project-switch test: sets the theme, HTTP and i18n
  providers in Svelte context during component initialisation (the only place
  Svelte context is legal) and renders the overlay from a props object the test
  can replace, the way React's `rerender` hands it a new `projectId`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { HttpClient } from '@molecule/app-http'
  import type { I18nProvider } from '@molecule/app-i18n'
  import type { QuickOpenProps } from '@molecule/app-ide-panel-logic'
  import {
    setHttpContext,
    setI18nContext,
    setThemeContext,
    type ThemeProvider,
  } from '@molecule/app-svelte'

  import QuickOpen from '../components/QuickOpen.svelte'

  let {
    theme,
    http,
    i18n,
    initial,
  }: {
    theme: ThemeProvider
    http: HttpClient
    i18n: I18nProvider
    initial: QuickOpenProps
  } = $props()

  // The overlay's current props (a test replaces them wholesale).
  let quickOpenProps = $state<QuickOpenProps>({ ...untrack(() => initial) })

  // The services are fixed for the whole mount.
  untrack(() => {
    setThemeContext(theme)
    setHttpContext(http)
    setI18nContext(i18n)
  })

  /**
   * Replaces the overlay's props (the host re-rendered with new values).
   *
   * @param next - The overlay's new props.
   */
  export function setProps(next: QuickOpenProps): void {
    quickOpenProps = next
  }
</script>

<QuickOpen {...quickOpenProps} />
