/**
 * Vue page scaffolds for Terms, Privacy, and PlanUpdated.
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
 * This is the Vue counterpart of `@molecule/app-legal-pages-react`: the same
 * export names, the same props (React names), the same ClassMap tokens and the
 * same DOM for the same input. Switching framework is a change of package name
 * in the imports only.
 *
 * @remarks
 * - **`appName` is HTML-escaped before interpolation.** The legal bodies are
 *   rendered as HTML (`innerHTML`); an `appName` carrying markup is escaped to
 *   inert entities first, so it can never execute inside the legal content.
 * - `LegalContentPage` / `useLegalModals` render bonded HTML that defaults to an
 *   EMPTY string until the locale module is registered — pass your app's
 *   `loadContent` (from `src/config.ts`, re-exporting
 *   `@molecule/app-locales-legal-default`) or the page/modal body will be blank.
 * - `PlanUpdatedPage` requires BOTH the app's router (it renders `Link`) and
 *   wired auth state from `@molecule/app-vue` — without an auth provider it
 *   shows a spinner forever (`state.initialized` never flips). The rest of the
 *   package is router-free.
 * - **Name collision:** `PlanUpdatedPage` is also exported by
 *   `@molecule/app-pricing-page-react` (the pricing-page-flavored success page),
 *   and a standalone `<PlanUpdated>` lives in
 *   `@molecule/app-plan-updated-page-react`. THIS package's `<PlanUpdatedPage>`
 *   is the legal-pages-kit confirmation page — import it from
 *   `@molecule/app-legal-pages-vue` when you use this kit's other pages.
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
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import {
 *   ContentPageShell,
 *   LegalPageLayout,
 *   LegalPageSection,
 *   TermsPage,
 * } from '@molecule/app-legal-pages-vue'
 *
 * // Drop-in Terms page (boilerplate body):
 * const Terms = defineComponent({ setup: () => () => h(TermsPage) })
 *
 * // Custom Terms page with structured sections:
 * const Custom = defineComponent({
 *   setup: () => () =>
 *     h(
 *       ContentPageShell,
 *       { eyebrow: 'Legal', title: 'Terms of Service', subtitle: 'Last updated June 2025' },
 *       {
 *         default: () =>
 *           h(LegalPageLayout, { title: 'Terms of Service' }, {
 *             default: () => [
 *               h(LegalPageSection, { title: 'Acceptance' }, {
 *                 default: () => [h('p', 'By using this service you agree to these terms.')],
 *               }),
 *             ],
 *           }),
 *       },
 *     ),
 * })
 *
 * createApp(Custom).mount('#app')
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
export * from './types.js'
