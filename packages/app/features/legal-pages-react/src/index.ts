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
 * @module
 */

export * from './LegalPageLayout.js'
export * from './LegalPageSection.js'
export * from './PlanUpdatedPage.js'
export * from './PrivacyPage.js'
export * from './TermsPage.js'
