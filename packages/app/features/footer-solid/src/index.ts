/**
 * App-shell footer — About link, Privacy/Terms surfaces (in-place modals or
 * route links), language-picker modal, and version display.
 *
 * The Solid counterpart of `@molecule/app-footer-react` — the same props,
 * i18n keys and DOM for the same input, with internal links wired to the
 * `@molecule/app-solid` router instead of react-router.
 *
 * @example
 * ```tsx
 * import { AppFooter } from '@molecule/app-footer-solid'
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
 * The `appName` interpolated into the Privacy/Terms modal HTML is
 * HTML-escaped first — the modal bodies render via `innerHTML`, so a
 * markup-carrying app name must arrive as inert entities.
 * - Must render inside a `MoleculeProvider` whose config wires BOTH `router`
 *   (the About link and `legalMode="route"` links navigate through it and
 *   throw outside it) and `i18n` — `useTranslation()` THROWS without i18n.
 *   `getClassMap()` needs a bonded ClassMap (e.g. `@molecule/app-ui-tailwind`);
 *   version display works unbonded (the version core falls back to a web
 *   provider).
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
 *   wire i18n with only the locales your app translated (or prune manually) so
 *   the picker shows what your app actually offers.
 *
 * @module
 */

export * from './AppFooter.js'
export * from './types.js'
