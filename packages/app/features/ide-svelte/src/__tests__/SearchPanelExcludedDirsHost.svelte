<!--
  Test host for the SearchPanel excluded-directories tests: sets the theme, HTTP
  and i18n providers in Svelte context during component initialisation (the only
  place Svelte context is legal) and renders the panel from a props object the
  test can replace, the way React's `rerender` hands it a new `excludedDirs`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { HttpClient } from '@molecule/app-http'
  import type { I18nProvider } from '@molecule/app-i18n'
  import type { SearchPanelProps } from '@molecule/app-ide-panel-logic'
  import {
    setHttpContext,
    setI18nContext,
    setThemeContext,
    type ThemeProvider,
  } from '@molecule/app-svelte'

  import SearchPanel from '../components/SearchPanel.svelte'

  let {
    theme,
    http,
    i18n,
    initial,
  }: {
    theme: ThemeProvider
    http: HttpClient
    i18n: I18nProvider
    initial: SearchPanelProps
  } = $props()

  // The panel's current props (a test replaces them wholesale).
  let panelProps = $state<SearchPanelProps>({ ...untrack(() => initial) })

  untrack(() => {
    setThemeContext(theme)
    setHttpContext(http)
    setI18nContext(i18n)
  })

  /**
   * Replaces the panel's props (the host re-rendered with new values).
   *
   * @param next - The panel's new props.
   */
  export function setProps(next: SearchPanelProps): void {
    panelProps = next
  }
</script>

<SearchPanel {...panelProps} />
