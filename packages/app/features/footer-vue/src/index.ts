/**
 * App-shell footer — About link, Privacy/Terms surfaces (in-place modals or
 * route links), language-picker modal, and version display.
 *
 * Vue counterpart of `@molecule/app-footer-react`: the same props (React
 * names), the same DOM for the same input, the same ClassMap tokens and i18n
 * keys. Reproduces the Footer pattern that appears in 9 flagship apps with one
 * line of variation (external WEBSITE_URL vs internal /about — handled here by
 * detecting `http`/`https` schemes in `aboutHref`).
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { moleculePlugin, createI18nPlugin, createRouterPlugin } from '@molecule/app-vue'
 * import { AppFooter } from '@molecule/app-footer-vue'
 *
 * const Shell = defineComponent({
 *   setup() {
 *     const loadContent = async (key: 'privacyPolicy' | 'termsOfService') => {
 *       // lazy-load the legal HTML into the i18n catalog before the modal opens
 *     }
 *     return () => h(AppFooter, { appName: 'Bearing', aboutHref: 'https://example.com', loadContent })
 *   },
 * })
 *
 * const app = createApp(Shell)
 * app.use(createI18nPlugin(i18nProvider))
 * app.use(createRouterPlugin(router))
 * app.mount('#app')
 * ```
 *
 * @remarks
 * The `appName` interpolated into the Privacy/Terms modal HTML is
 * HTML-escaped first — the modal bodies render via `innerHTML`, so a
 * markup-carrying app name must arrive as inert entities.
 * - Must render inside BOTH the binding's router plugin (the About link and
 *   `legalMode="route"` links navigate through `useRouter()`, which throws
 *   outside it) and its i18n plugin — `useTranslation()` needs a provider
 *   (the bonded `@molecule/app-i18n` provider also satisfies it).
 *   `getClassMap()` needs a bonded ClassMap (e.g. `@molecule/app-ui-tailwind`);
 *   version display works unbonded (the version core falls back to a web
 *   provider).
 * - The privacy/terms modals render whatever HTML the i18n catalog holds under
 *   `content.privacyPolicy` / `content.termsOfService`. The companion locale
 *   bond ships those keys EMPTY BY DESIGN — a generic default policy would be
 *   legally wrong to present as an app's own — so the app MUST register its
 *   real legal HTML: add it to the app's locale catalog (scaffolded apps
 *   lazy-load it via `loadContent` from `config.ts`), wire a legal-default
 *   locale bond, or use `legalMode="route"` and render your own /privacy and
 *   /terms pages. Until content is registered the modal shows a clear
 *   `footer.legalNotConfigured` placeholder ("…the app owner must provide it.")
 *   instead of a blank modal — no fabricated legal text is ever shipped.
 * - The language picker lists every locale registered on the i18n provider —
 *   wire i18n with the locales your app actually translated.
 *
 * @module
 */

export * from './AppFooter.js'
export * from './types.js'
