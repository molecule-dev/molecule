<!--
  Resilient default for the AppHeader `themeToggle` slot: renders
  `<ThemeToggle />` only when BOTH the theme provider and the i18n provider
  are mounted above the header, and omits it (never throws) when they are
  not — so `<AppHeader appName="…" />` renders out of the box even before an
  app has wired theme/i18n, and the toggle appears automatically with no
  extra prop once both providers exist.
-->
<script lang="ts">
  import { ThemeToggle } from '@molecule/app-ui-svelte'

  import { probeI18nProvider, probeThemeProvider } from './providers.js'

  // Probed once, during component init: Svelte context is fixed for a
  // component's lifetime, so the providers present at init are the ones it
  // will ever see.
  const theme = probeThemeProvider()
  const i18n = probeI18nProvider()
</script>

{#if theme && i18n}
  <ThemeToggle />
{/if}
