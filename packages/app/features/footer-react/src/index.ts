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
 * - The modal bodies read rich catalog text. The five portable tags render as
 *   elements, with `appName` inserted as literal text. Custom HTML uses the
 *   web compatibility renderer.
 * - Internal About and legal links require the app's router. Translations use
 *   the nearest `I18nProvider` or the bonded i18n provider. `getClassMap()` needs a bonded ClassMap
 *   (e.g. `@molecule/app-ui-tailwind`); version display works unbonded (the
 *   version core falls back to a web provider).
 * - The privacy/terms modals render whatever HTML the i18n catalog holds under
 *   `content.privacyPolicy` / `content.termsOfService`. The companion
 *   `@molecule/app-locales-footer` bond ships those keys EMPTY BY DESIGN — a
 *   generic default policy would be legally wrong to present as an app's own —
 *   so the app MUST register its real legal HTML: add it to the app's locale
 *   catalog (scaffolded apps lazy-load it via `loadContent` from `config.ts`),
 *   wire the generic-template `@molecule/app-locales-legal-default` bond, or use
 *   `legalMode="route"` and render your own /privacy and /terms pages. Until
 *   content is registered the modal shows a clear `footer.legalNotConfigured`
 *   placeholder ("…the app owner must provide it.") instead of a blank modal —
 *   no fabricated legal text is ever shipped.
 * - The language picker lists every locale registered on the i18n provider —
 *   wire i18n with `@molecule/app-i18n-default-react`'s `setupI18nDefault()`
 *   (or prune manually) so only locales your app translated appear.
 *
 * @module
 */
export * from './AppFooter.js'
