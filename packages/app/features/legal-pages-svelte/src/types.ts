/**
 * Props and API types of `@molecule/app-legal-pages-svelte` — the Svelte
 * counterpart of `@molecule/app-legal-pages-react`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import type { Component, Snippet } from 'svelte'

import type { SpacingScale } from '@molecule/app-ui'

/** Which legal document a `LegalContentPage` renders. */
export type LegalKind = 'privacy' | 'terms'

/** Props accepted by the {@link ContentPageShell} component. */
export interface ContentPageShellProps {
  /** `data-mol-id` applied to the hero band for AI-agent selectors. */
  dataMolId?: string
  /** Small uppercase label above the title (e.g. "Legal", "Billing"). */
  eyebrow?: Snippet
  /**
   * Page title, rendered in the app's headline font inside the hero band.
   * Omit to skip the hero entirely (e.g. for content that renders its own
   * heading, like a pricing tier grid).
   */
  title?: Snippet
  /** Optional supporting line under the title (e.g. "Last updated …"). */
  subtitle?: Snippet
  /** App-specific top navigation, rendered above the hero. */
  header?: Snippet
  /** App-specific footer, rendered below the content. */
  footer?: Snippet
  /** Page body. Rendered inside a surface card unless `bare` is set. */
  children: Snippet
  /**
   * When true, the body is rendered without the surface card wrapper — for
   * content that brings its own surfaces (e.g. a pricing tier grid).
   */
  bare?: boolean
  /** Container width passed to ClassMap `container({ size })`. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
}

/** Props accepted by the {@link LegalContentPage} component. */
export interface LegalContentPageProps {
  /** Which legal document to render. */
  kind: LegalKind
  /** App name interpolated into the policy body (privacy uses `{{appName}}`). */
  appName?: string
  /**
   * Lazy-loader for the legal HTML (pass `loadContent` from the app's
   * `src/config.ts`, which re-exports it from
   * `@molecule/app-locales-legal-default`). Called once on mount so the
   * standalone page shows the **same** bonded content as the footer modal.
   */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
  /** App-specific top navigation, rendered above the hero. */
  header?: Snippet
  /** App-specific footer, rendered below the content. */
  footer?: Snippet
  /** i18n key for the small uppercase eyebrow. Defaults to `nav.legal`. */
  eyebrowKey?: string
  /** Default eyebrow text. Defaults to `Legal`. */
  eyebrowDefault?: string
}

/** Shared options for the legal-modal hook + component. */
export interface UseLegalModalsOptions {
  /** App name interpolated into the privacy AND terms bodies (`{{appName}}`). */
  appName?: string
  /**
   * Lazy-loader for the legal HTML — pass `loadContent` from the app's
   * `src/config.ts`. Called right before a modal opens so the bonded
   * content is present on first render.
   */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
}

/** The open state the modals component renders from (reactive in Svelte). */
interface LegalModalsState {
  /** Whether the Privacy Policy modal is open. */
  privacyOpen: boolean
  /** Whether the Terms of Service modal is open. */
  termsOpen: boolean
  /** App name interpolated into both bodies. */
  appName?: string
}

/** Imperative API returned by {@link useLegalModals}. */
export interface LegalModalsApi {
  /** Open the Privacy Policy modal (loads content first). */
  openPrivacy: () => Promise<void>
  /** Open the Terms of Service modal (loads content first). */
  openTerms: () => Promise<void>
  /** The modals' open state — read by the component `modals` names. */
  state: LegalModalsState
  /**
   * The two `<Modal>`s as a component: render it once with
   * `@const Modals = api.modals` then `<Modals {api} />` (React returns the element
   * pair; a Svelte snippet cannot be built outside a component, so the modals
   * ship as the component that renders them).
   */
  modals: Component<{ api: LegalModalsApi }>
}

/** Props accepted by the {@link LegalModalLinks} component. */
export interface LegalModalLinksProps extends UseLegalModalsOptions {
  /** className applied to each trigger `<button>` (match the footer's link style). */
  linkClassName?: string
  /** Which links to render. Defaults to `'both'`. */
  show?: 'both' | 'privacy' | 'terms'
  /** Override the Privacy label (defaults to i18n `footer.privacyPolicy`). */
  privacyLabel?: Snippet
  /** Override the Terms label (defaults to i18n `footer.termsOfService`). */
  termsLabel?: Snippet
}

/** Props accepted by the {@link LegalPageLayout} component. */
export interface LegalPageLayoutProps {
  /** `data-mol-id` for AI agent selectors. */
  dataMolId?: string
  /** Rendered heading text (usually `t('...')`). */
  title: Snippet
  /** Body content — paragraphs, `<LegalPageSection>`s, etc. Omitted renders nothing (React's `null` children). */
  children?: Snippet
  /** ClassMap `container({size})` value. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Stack gap between body children passed to ClassMap `stack()`. Defaults to 4. */
  stackGap?: SpacingScale
  /** Override the main wrapper's className (used by apps with custom chrome). */
  mainClassName?: string
  /** Override the body wrapper's className. */
  bodyClassName?: string
}

/** Props accepted by the {@link LegalPageSection} component. */
export interface LegalPageSectionProps {
  /** Rendered heading text. */
  title: Snippet
  /** Section body — one or more paragraphs. Omitted renders nothing. */
  children?: Snippet
  /** Stack gap between heading and body (ClassMap `stack()`). Defaults to 2. */
  stackGap?: SpacingScale
}

/** Props accepted by the {@link PlanUpdatedPage} component. */
export interface PlanUpdatedPageProps {
  /** i18n key for the primary message heading. */
  messageKey?: string
  /** Default message when the key is missing. */
  messageDefault?: string
  /** i18n key for the secondary heading. */
  thankYouKey?: string
  /** Default thank-you text when the key is missing. */
  thankYouDefault?: string
  /** i18n key for the action-button label. */
  actionKey?: string
  /** Default action label when the key is missing. */
  actionDefault?: string
  /** Href the action button navigates to. Defaults to `/`. */
  actionHref?: string
  /**
   * Provider name to verify the purchase with when the return URL carries no
   * `provider` parameter. Verification is skipped when neither names one.
   */
  provider?: string
  /**
   * Set `false` to render the confirmation without verifying the purchase —
   * only for apps that grant the plan some other way.
   */
  verify?: boolean
}

/** Props accepted by the {@link PrivacyPage} component. */
export interface PrivacyPageProps {
  /** i18n key for the page heading. Defaults to `privacy.title`. */
  titleKey?: string
  /** Default for the heading when the key is missing. Defaults to `"Privacy"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when children are passed). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body — use when the page has real content. */
  children?: Snippet
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}

/** Props accepted by the {@link TermsPage} component. */
export interface TermsPageProps {
  /** i18n key for the page heading. Defaults to `terms.title`. */
  titleKey?: string
  /** Default for the heading when the i18n key is missing. Defaults to `"Terms"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when children are passed). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body — use when the page has real content, not boilerplate. */
  children?: Snippet
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}
