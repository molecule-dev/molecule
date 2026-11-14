/**
 * Svelte app-shell footer — the Svelte counterpart of
 * `@molecule/app-footer-react`, with the same props and the same DOM: About
 * link, Privacy/Terms surfaces (in-place modals or route links),
 * language-picker modal, and version display.
 *
 * Reproduces the Footer pattern that appears in 9 flagship apps with one line
 * of variation (external WEBSITE_URL vs internal /about — handled by
 * detecting `http`/`https` schemes in `aboutHref`).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AppFooter } from '@molecule/app-footer-svelte'
 *
 *   const loadContent = async (key: 'privacyPolicy' | 'termsOfService') => {
 *     // lazy-load the legal HTML into the i18n catalog before the modal opens
 *   }
 * </script>
 *
 * <AppFooter appName="Bearing" aboutHref="https://example.com" loadContent={loadContent} />
 * ```
 *
 * @remarks
 * The `appName` interpolated into the Privacy/Terms modal HTML is
 * HTML-escaped first — the modal bodies render as raw HTML, so a
 * markup-carrying app name must arrive as inert entities.
 * - Must render inside BOTH `@molecule/app-svelte`'s router context
 *   (`setMoleculeContext({ router })` — the internal About link and
 *   `legalMode="route"` links navigate through it, exactly as the React
 *   footer requires a `react-router-dom` router) and its i18n context —
 *   `useTranslation()` THROWS without the provider. `getClassMap()` needs a
 *   bonded ClassMap (e.g. `@molecule/app-ui-tailwind`); version display works
 *   unbonded (the version core falls back to a web provider).
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
 *   wire i18n so only locales your app translated appear.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
