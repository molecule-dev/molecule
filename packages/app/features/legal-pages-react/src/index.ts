/**
 * React page scaffolds for Terms, Privacy, and PlanUpdated.
 *
 * Exports both high-level "drop-in" page components (`TermsPage`,
 * `PrivacyPage`, `PlanUpdatedPage`) and composable primitives
 * (`LegalPageLayout`, `LegalPageSection`) for apps that need custom
 * chrome or structured multi-section content.
 *
 * All text routes through `useTranslation()` so apps stay i18n-driven
 * while reusing the canonical layout and typography.
 *
 * @example
 * ```tsx
 * import { ContentPageShell, LegalPageLayout, LegalPageSection, TermsPage } from '@molecule/app-legal-pages-react'
 *
 * // Drop-in Terms page (boilerplate body):
 * <TermsPage />
 *
 * // Custom Terms page with structured sections:
 * <ContentPageShell eyebrow="Legal" title="Terms of Service" subtitle="Last updated June 2025" header={<AppNav />}>
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
