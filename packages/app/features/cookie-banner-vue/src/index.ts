/**
 * Vue GDPR cookie consent banner.
 *
 * Exports `<CookieBanner>` and the `CookieCategory` type. It is the Vue
 * counterpart of `@molecule/app-cookie-banner-react`: the same props (React
 * names), the same DOM for the same input, and the same callback calls.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { CookieBanner } from '@molecule/app-cookie-banner-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const consentGiven = ref(false)
 *     return () =>
 *       h(CookieBanner, {
 *         visible: !consentGiven.value,
 *         policyHref: '/privacy',
 *         categories: [
 *           { id: 'essential', label: 'Essential', required: true },
 *           { id: 'analytics', label: 'Analytics', defaultEnabled: false },
 *         ],
 *         onAcceptAll: () => saveConsent('all'),
 *         onRejectAll: () => saveConsent('essential'),
 *         onSave: (enabled) => saveConsent(enabled),
 *         onDismiss: () => {
 *           consentGiven.value = true
 *         },
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * The banner is UI-only — it stores nothing. `onAcceptAll` / `onRejectAll`
 * receive NO arguments (derive "all on"/"essential only" yourself); only
 * `onSave` receives the per-category `Record<string, boolean>`, and the
 * "Save preferences" button renders only when `categories` AND `onSave` are
 * provided and the user opened "Customize". Category toggle state is
 * captured from `categories` on first render — later prop changes do not
 * reset it. Visibility is controlled: keep `visible` false once consent is
 * stored. Text uses `cookieBanner.*` i18n keys (companion bond:
 * `@molecule/app-locales-cookie-banner`); `title`/`description`/category
 * labels you pass in should already be translated. Node-valued props
 * (`title`, `description`) arrive as a prop AND as a same-named slot;
 * the component accepts either.
 *
 * @module
 */

export * from './CookieBanner.js'
export * from './types.js'
