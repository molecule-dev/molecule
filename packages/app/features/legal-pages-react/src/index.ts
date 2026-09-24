/**
 * React page scaffolds for Terms, Privacy, and PlanUpdated.
 *
 * Exports:
 * - Drop-in pages: `<TermsPage>`, `<PrivacyPage>` (boilerplate bodies with
 *   configurable i18n keys), `<PlanUpdatedPage>` (post-checkout confirmation).
 * - Bonded-content pages: `<LegalContentPage kind="privacy" | "terms">` — renders
 *   the SAME legal HTML as the footer modals (`content.privacyPolicy` /
 *   `content.termsOfService` from `@molecule/app-locales-legal-default`), inside
 *   the branded `<ContentPageShell>`.
 * - In-place modals: `<LegalModalLinks>` + `useLegalModals()` — Privacy/Terms
 *   triggers that open modals instead of navigating.
 * - Primitives: `<ContentPageShell>` (hero band + surface card),
 *   `<LegalPageLayout>`, `<LegalPageSection>`.
 *
 * @remarks
 * - **`appName` is HTML-escaped before interpolation.** The legal bodies are
 *   rendered as HTML (`dangerouslySetInnerHTML`); an `appName` carrying
 *   markup is escaped to inert entities first, so it can never execute
 *   inside the legal content.
 * - Prefer `LegalContentPage` over hand-writing policy text: it renders the real bonded
 *   privacy/terms HTML. That HTML defaults to an EMPTY string until the content module is
 *   registered — pass `loadContent` (from `@molecule/app-locales-legal-default`, or your app's
 *   `src/config.ts` re-export of it) or the page/modal body will be blank. `loadContent`
 *   registers into the BONDED i18n provider (`getProvider()` from `@molecule/app-i18n`), so
 *   the `<I18nProvider>` / `<MoleculeProvider>` above the page must be given that same
 *   provider — a separate `createSimpleI18nProvider()` instance never sees the content.
 * - Every page calls `useTranslation()` from `@molecule/app-react` (so it must render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`), and `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 * - `PlanUpdatedPage` requires BOTH a react-router `<Router>` ancestor (it renders
 *   a `<Link>`) and wired auth state from `@molecule/app-react` — without an auth
 *   provider it shows a spinner forever (`state.initialized` never flips). The
 *   rest of the package is router-free.
 * - **Name collision:** `PlanUpdatedPage` is also exported by
 *   `@molecule/app-pricing-page-react` (the pricing-page-flavored success page), and a
 *   standalone `<PlanUpdated>` lives in `@molecule/app-plan-updated-page-react`. THIS
 *   package's `<PlanUpdatedPage>` is the legal-pages-kit confirmation page — import it
 *   from `@molecule/app-legal-pages-react` when you use this kit's other pages.
 * - `ContentPageShell`'s hero reads `var(--mol-color-primary)` and
 *   `var(--mol-color-background)` with no fallback, and uses Tailwind theme
 *   utilities (`font-display`, `bg-background`, `border-outline-variant`) — the
 *   app theme must define the `--mol-color-` override tokens and font utilities
 *   or the hero band renders unstyled.
 * - `TermsPage`/`PrivacyPage` default keys (`terms.title`, `terms.intro`,
 *   `privacy.title`, `privacy.intro`) and the `nav.legal` eyebrow ship in no
 *   locale bond — the English `defaultValue`s render unless your app defines
 *   those keys (all keys are overridable via props).
 *
 * @example
 * ```tsx
 * import { getProvider } from '@molecule/app-i18n'
 * import { LegalContentPage } from '@molecule/app-legal-pages-react'
 * import { loadContent } from '@molecule/app-locales-legal-default'
 * import { I18nProvider } from '@molecule/app-react'
 *
 * // Route component for `/privacy` (use kind="terms" for `/terms`).
 * export function PrivacyRoute() {
 *   return <LegalContentPage kind="privacy" appName="Acme Notes" loadContent={loadContent} />
 * }
 *
 * // App root: the React i18n context must be the SAME bonded provider `loadContent` writes into.
 * export function App() {
 *   return (
 *     <I18nProvider provider={getProvider()}>
 *       <PrivacyRoute />
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './ContentPageShell.js'
export * from './LegalContentPage.js'
export * from './LegalModalLinks.js'
export * from './LegalPageLayout.js'
export * from './LegalPageSection.js'
export * from './PlanUpdatedPage.js'
export * from './PrivacyPage.js'
export * from './TermsPage.js'
