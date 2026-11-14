/**
 * Resilient default for the {@link AppHeader} `themeToggle` slot.
 *
 * @module
 */

import { defineComponent, h, inject } from 'vue'

import { ThemeToggle } from '@molecule/app-ui-vue'
import { I18nKey, ThemeKey } from '@molecule/app-vue'

/**
 * Renders `<ThemeToggle />` only when the theme and i18n providers are both
 * installed above the header.
 *
 * `ThemeToggle` reads `useTheme()` + `useTranslation()`, both of which THROW
 * when `@molecule/app-vue`'s theme/i18n plugins are not installed. This
 * wrapper probes their injection keys with `inject(Key, null)` — which
 * returns `null` (rather than throwing) when a provider is absent — and
 * renders the real toggle only when BOTH are present. Without them the slot
 * is silently omitted, so `<AppHeader appName="…" />` renders out of the box
 * even before an app has wired theme/i18n. Once both providers exist, the
 * toggle appears automatically with no extra prop.
 *
 * @returns The probe component.
 */
export const DefaultThemeToggle = defineComponent({
  name: 'DefaultThemeToggle',
  setup() {
    const themeProvider = inject(ThemeKey, null)
    const i18nProvider = inject(I18nKey, null)
    return () => (themeProvider && i18nProvider ? h(ThemeToggle) : null)
  },
})
