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
 * - `LegalContentPage` / `useLegalModals` render bonded HTML that defaults to an
 *   EMPTY string until the locale module is registered — pass your app's
 *   `loadContent` (from `src/config.ts`, re-exporting
 *   `@molecule/app-locales-legal-default`) or the page/modal body will be blank.
 * - `PlanUpdatedPage` requires BOTH a react-router `<Router>` ancestor (it renders
 *   a `<Link>`) and wired auth state from `@molecule/app-react` — without an auth
 *   provider it shows a spinner forever (`state.initialized` never flips). The
 *   rest of the package is router-free.
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
 * import { ContentPageShell, LegalPageLayout, LegalPageSection, TermsPage } from '@molecule/app-legal-pages-react'
 *
 * // Drop-in Terms page (boilerplate body):
 * <TermsPage />
 *
 * // Custom Terms page with structured sections:
 * <ContentPageShell eyebrow="Legal" title="Terms of Service" subtitle="Last updated June 2025">
 *   <LegalPageLayout title="Terms of Service">
 *     <LegalPageSection title="Acceptance">
 *       <p>By using this service you agree to these terms.</p>
 *     </LegalPageSection>
 *   </LegalPageLayout>
 * </ContentPageShell>
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
