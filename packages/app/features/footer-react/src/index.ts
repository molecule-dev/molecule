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
 * import { BrowserRouter } from 'react-router'
 *
 * import { AppFooter } from '@molecule/app-footer-react'
 * import { createSimpleI18nProvider } from '@molecule/app-i18n'
 * import { I18nProvider } from '@molecule/app-react'
 *
 * const i18n = createSimpleI18nProvider('en')
 *
 * // The legal HTML is YOURS to supply — registered on first open of each modal.
 * function loadContent(key: 'privacyPolicy' | 'termsOfService'): void {
 *   const html = {
 *     privacyPolicy: '<p>{{appName}} stores only your email address.</p>',
 *     termsOfService: '<p>Use {{appName}} responsibly.</p>',
 *   }[key]
 *   i18n.addTranslations('en', { content: { [key]: html } })
 * }
 *
 * export function App() {
 *   return (
 *     <I18nProvider provider={i18n}>
 *       <BrowserRouter>
 *         <main>Dashboard</main>
 *         <AppFooter appName="Bearing" aboutHref="/about" loadContent={loadContent} />
 *       </BrowserRouter>
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * The `appName` interpolated into the Privacy/Terms modal HTML is
 * HTML-escaped first — the modal bodies render via `dangerouslySetInnerHTML`,
 * so a markup-carrying app name must arrive as inert entities.
 * - Must render inside BOTH a React Router router (the About link and
 *   `legalMode="route"` links are `<Link>` from `react-router` — they throw
 *   outside a Router) and `@molecule/app-react`'s `I18nProvider` —
 *   `useTranslation()` THROWS without it. `getClassMap()` needs a bonded
 *   ClassMap (`setClassMap(classMap)`, e.g. `@molecule/app-ui-tailwind`), and
 *   the globe/close icons need an icon set (`setIconSet(iconSet)` from
 *   `@molecule/app-icons` + `@molecule/app-icons-molecule`). Version display
 *   works unbonded (the version core falls back to a web provider) and shows
 *   `v1.0.0` until a version is known.
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
