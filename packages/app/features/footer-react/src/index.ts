/**
 * App-shell footer — About link, Privacy/Terms surfaces (in-place modals or
 * route links), language-picker modal, and version display.
 *
 * Reproduces the Footer pattern that appears in 9 flagship apps with one line
 * of variation (external WEBSITE_URL vs internal /about — handled here by
 * detecting `http`/`https` schemes in `aboutHref`).
 *
 * @example
 * ```tsx
 * import { AppFooter } from '@molecule/app-footer-react'
 *
 * function Shell() {
 *   const loadContent = async (key: 'privacyPolicy' | 'termsOfService') => {
 *     // lazy-load the legal HTML into the i18n catalog before the modal opens
 *   }
 *   return <AppFooter appName="Bearing" aboutHref="https://example.com" loadContent={loadContent} />
 * }
 * ```
 *
 * @remarks
 * - Must render inside BOTH a `react-router-dom` router (the About link and
 *   `legalMode="route"` links are `<Link>` elements — they throw outside a
 *   Router) and `@molecule/app-react`'s `I18nProvider` — `useTranslation()`
 *   THROWS without it. `getClassMap()` needs a bonded ClassMap
 *   (e.g. `@molecule/app-ui-tailwind`); version display works unbonded (the
 *   version core falls back to a web provider).
 * - The privacy/terms modals render whatever HTML the i18n catalog holds under
 *   `content.privacyPolicy` / `content.termsOfService`. The companion
 *   `@molecule/app-locales-footer` bond ships those keys EMPTY — register your
 *   legal HTML in the app's locale catalog (scaffolded apps lazy-load it via
 *   `loadContent` from `config.ts`), or use `legalMode="route"` and render
 *   your own /privacy and /terms pages.
 * - The language picker lists every locale registered on the i18n provider —
 *   wire i18n with `@molecule/app-i18n-default-react`'s `setupI18nDefault()`
 *   (or prune manually) so only locales your app translated appear.
 *
 * @module
 */
export * from './AppFooter.js'
