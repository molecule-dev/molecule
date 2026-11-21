/**
 * Angular page scaffolds for Terms, Privacy, and PlanUpdated.
 *
 * Exports:
 * - Drop-in pages: `<TermsPage>`, `<PrivacyPage>` (boilerplate bodies with
 *   configurable i18n keys), `<PlanUpdatedPage>` (post-checkout confirmation).
 * - Bonded-content pages: `<LegalContentPage kind="privacy" | "terms">` — renders
 *   the SAME legal HTML as the footer modals (`content.privacyPolicy` /
 *   `content.termsOfService` from `@molecule/app-locales-legal-default`), inside
 *   the branded `ContentPageShell` shell.
 * - In-place modals: `<LegalModalLinks>` + `useLegalModals()` — Privacy/Terms
 *   triggers that open modals instead of navigating.
 * - Primitives: `<ContentPageShell>` (hero band + surface card),
 *   `<LegalPageLayout>`, `<LegalPageSection>`.
 *
 * This is the Angular counterpart of `@molecule/app-legal-pages-react`: the same
 * export names, the same props (React names), the same ClassMap tokens and the
 * same DOM for the same input. Switching framework is a change of package name
 * in the imports only.
 *
 * @remarks
 * - **`appName` is HTML-escaped before interpolation.** The legal bodies are
 *   rendered as HTML (a sanitizer-bypassed `[innerHTML]`, React's
 *   `dangerouslySetInnerHTML` trust model); an `appName` carrying markup is
 *   escaped to inert entities first, so it can never execute inside the legal
 *   content.
 * - Node-valued props are projected content: `[slot=header]`, `[slot=footer]`,
 *   `[slot=title]`, `[slot=eyebrow]`, `[slot=subtitle]`, `[slot=privacyLabel]`,
 *   `[slot=termsLabel]`; the body is each element's default content.
 * - `LegalContentPage` / `useLegalModals` render bonded HTML that defaults to an
 *   EMPTY string until the locale module is registered — pass your app's
 *   `loadContent` (from `src/config.ts`, re-exporting
 *   `@molecule/app-locales-legal-default`) or the page/modal body will be blank.
 * - `PlanUpdatedPage` requires BOTH the app's router (it renders the router
 *   link) and wired auth state from `@molecule/app-angular` — without an auth
 *   provider it shows a spinner forever (`state.initialized` never flips). The
 *   rest of the package is router-free.
 * - **Name collision:** `PlanUpdatedPage` is also exported by
 *   `@molecule/app-pricing-page-react` (the pricing-page-flavored success page),
 *   and a standalone `<PlanUpdated>` lives in
 *   `@molecule/app-plan-updated-page-react`. THIS package's `<PlanUpdatedPage>`
 *   is the legal-pages-kit confirmation page — import it from
 *   `@molecule/app-legal-pages-angular` when you use this kit's other pages.
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
 * import { Component } from '@angular/core'
 * import { ContentPageShell, LegalPageLayout, LegalPageSection, TermsPage } from '@molecule/app-legal-pages-angular'
 *
 * // Drop-in Terms page (boilerplate body):
 * @Component({
 *   selector: 'app-terms',
 *   standalone: true,
 *   imports: [TermsPage],
 *   template: `<mol-terms-page />`,
 * })
 * export class Terms {}
 *
 * // Custom Terms page with structured sections:
 * @Component({
 *   selector: 'app-custom-terms',
 *   standalone: true,
 *   imports: [ContentPageShell, LegalPageLayout, LegalPageSection],
 *   template: `
 *     <div mol-content-page-shell>
 *       <span slot="eyebrow">Legal</span>
 *       <span slot="title">Terms of Service</span>
 *       <main mol-legal-page-layout>
 *         <span slot="title">Terms of Service</span>
 *         <section mol-legal-page-section>
 *           <span slot="title">Acceptance</span>
 *           <p>By using this service you agree to these terms.</p>
 *         </section>
 *       </main>
 *     </div>
 *   `,
 * })
 * export class CustomTerms {}
 * ```
 *
 * @module
 */

export * from './content-page-shell.component.js'
export * from './legal-content-page.component.js'
export * from './legal-modal-links.component.js'
export * from './legal-modals.js'
export * from './legal-page-layout.component.js'
export * from './legal-page-section.component.js'
export * from './plan-updated-page.component.js'
export * from './privacy-page.component.js'
export * from './terms-page.component.js'
export * from './types.js'
