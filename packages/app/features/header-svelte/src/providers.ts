/**
 * Non-throwing probes for the molecule providers the header's default theme
 * toggle needs.
 *
 * The binding's getters (`getThemeProvider`, `getI18nProvider`) THROW when
 * their provider was never set in Svelte context — which is exactly the
 * presence signal the resilient default needs (the same contract React's
 * header implements by reading its contexts with `useContext`, which returns
 * null rather than throwing). Each probe treats "threw" as "absent" and never
 * surfaces the error: the default slot's documented behavior is to omit the
 * toggle, not to crash the header.
 *
 * @module
 */

import type { I18nProvider, ThemeProvider } from '@molecule/app-svelte'
import { getI18nProvider, getThemeProvider } from '@molecule/app-svelte'

/**
 * Probes for the theme provider without throwing when it is absent.
 *
 * Must run during component initialisation — it reads Svelte context, which
 * is only legal there.
 *
 * @returns The theme provider, or `null` when none is mounted above the header.
 */
export function probeThemeProvider(): ThemeProvider | null {
  try {
    return getThemeProvider()
  } catch (_error) {
    // The provider is absent — the probe's meaningful result, not a failure.
    // The resilient default renders nothing instead of throwing, so the
    // header renders out of the box before theme is wired.
    return null
  }
}

/**
 * Probes for the i18n provider without throwing when it is absent.
 *
 * Must run during component initialisation — it reads Svelte context, which
 * is only legal there.
 *
 * @returns The i18n provider, or `null` when none is mounted above the header.
 */
export function probeI18nProvider(): I18nProvider | null {
  try {
    return getI18nProvider()
  } catch (_error) {
    // The provider is absent — the probe's meaningful result, not a failure.
    // The resilient default renders nothing instead of throwing, so the
    // header renders out of the box before i18n is wired.
    return null
  }
}
