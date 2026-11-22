<!--
  Test host for SearchPanel: sets the theme, HTTP and i18n providers in Svelte
  context during component initialisation (the only place Svelte context is
  legal) and renders the panel with the props it was given. The React reference
  wraps its panel in ThemeProvider / HttpProvider / I18nProvider the same way.
-->
<script lang="ts">
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
    ...rest
  }: SearchPanelProps & {
    theme: ThemeProvider
    http: HttpClient
    i18n: I18nProvider
  } = $props()
  setThemeContext(theme)
  setHttpContext(http)
  setI18nContext(i18n)
</script>

<SearchPanel {...rest} />
