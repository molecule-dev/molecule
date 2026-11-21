/**
 * Props and API types of `@molecule/app-legal-pages-angular` — the Angular
 * counterpart of `@molecule/app-legal-pages-react`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import type { ComponentRef, ViewContainerRef, WritableSignal } from '@angular/core'

import type { SpacingScale } from '@molecule/app-ui'

/** Which legal document a `LegalContentPage` renders. */
export type LegalKind = 'privacy' | 'terms'

/**
 * Props accepted by {@link ContentPageShell} — the same props
 * `@molecule/app-legal-pages-react` accepts. Node props (`eyebrow`, `title`,
 * `subtitle`, `header`, `footer`, `children`) are projected content in Angular
 * (an input cannot carry a node), so they are typed `unknown`: pass them in the
 * host template (`[slot=title]`, `[slot=eyebrow]`, …), not as values.
 */
export interface ContentPageShellProps {
  /** `data-mol-id` applied to the hero band for AI-agent selectors. */
  dataMolId?: string
  /** Small uppercase label above the title, projected as `[slot=eyebrow]` content. */
  eyebrow?: unknown
  /**
   * Page title, rendered in the app's headline font inside the hero band,
   * projected as `[slot=title]` content. Omit to skip the hero entirely.
   */
  title?: unknown
  /** Optional supporting line under the title, projected as `[slot=subtitle]`. */
  subtitle?: unknown
  /** App-specific top navigation, projected as `[slot=header]` content. */
  header?: unknown
  /** App-specific footer, projected as `[slot=footer]` content. */
  footer?: unknown
  /** Page body, projected as the element's default content. */
  children?: unknown
  /**
   * When true, the body is rendered without the surface card wrapper — for
   * content that brings its own surfaces (e.g. a pricing tier grid).
   */
  bare?: boolean
  /** Container width passed to ClassMap `container({ size })`. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Props accepted by {@link LegalContentPage}. Node props (`header`, `footer`)
 * are projected content (`[slot=header]`, `[slot=footer]`).
 */
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
  /** App-specific top navigation, projected as `[slot=header]` content. */
  header?: unknown
  /** App-specific footer, projected as `[slot=footer]` content. */
  footer?: unknown
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

/** The open state the modals component renders from (Angular signals). */
interface LegalModalsState {
  /** Whether the Privacy Policy modal is open. */
  privacyOpen: WritableSignal<boolean>
  /** Whether the Terms of Service modal is open. */
  termsOpen: WritableSignal<boolean>
  /** App name interpolated into both bodies. */
  appName?: string
}

/** Imperative API returned by {@link useLegalModals}. */
export interface LegalModalsApi {
  /** Open the Privacy Policy modal (loads content first). */
  openPrivacy: () => Promise<void>
  /** Open the Terms of Service modal (loads content first). */
  openTerms: () => Promise<void>
  /** The modals' open state — read by the modals component. */
  state: LegalModalsState
  /**
   * Renders the two `<mol-modal>`s into the container the caller passes (React
   * returns the element pair; an Angular template cannot render a component
   * class held in a value, so the pair is created imperatively). Call it once,
   * from the component that owns the triggers:
   *
   * ```ts
   * @ViewChild('modals', { read: ViewContainerRef }) anchor?: ViewContainerRef
   * ngOnInit(): void { this.api.modals(this.anchor!) }
   * ```
   *
   * @param viewContainerRef - The container the modals are inserted into.
   * @returns The created component reference.
   */
  modals: (viewContainerRef: ViewContainerRef) => ComponentRef<unknown>
}

/**
 * Props accepted by {@link LegalModalLinks}. Node props (`privacyLabel`,
 * `termsLabel`) are projected content (`[slot=privacyLabel]`,
 * `[slot=termsLabel]`).
 */
export interface LegalModalLinksProps extends UseLegalModalsOptions {
  /** className applied to each trigger `<button>` (match the footer's link style). */
  linkClassName?: string
  /** Which links to render. Defaults to `'both'`. */
  show?: 'both' | 'privacy' | 'terms'
  /** Override the Privacy label, projected as `[slot=privacyLabel]` content. */
  privacyLabel?: unknown
  /** Override the Terms label, projected as `[slot=termsLabel]` content. */
  termsLabel?: unknown
}

/**
 * Props accepted by {@link LegalPageLayout}. The heading is projected content
 * (`[slot=title]`); the body is the element's default content.
 */
export interface LegalPageLayoutProps {
  /** `data-mol-id` for AI agent selectors. */
  dataMolId?: string
  /** Rendered heading text, projected as `[slot=title]` content. */
  title?: unknown
  /** Body content — paragraphs, sections, etc. (default projection). */
  children?: unknown
  /** ClassMap `container({size})` value. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Stack gap between body children passed to ClassMap `stack()`. Defaults to 4. */
  stackGap?: SpacingScale
  /** Override the main wrapper's className (used by apps with custom chrome). */
  mainClassName?: string
  /** Override the body wrapper's className. */
  bodyClassName?: string
}

/**
 * Props accepted by {@link LegalPageSection}. The heading is projected content
 * (`[slot=title]`); the body is the element's default content.
 */
export interface LegalPageSectionProps {
  /** Rendered heading text, projected as `[slot=title]` content. */
  title?: unknown
  /** Section body — one or more paragraphs (default projection). */
  children?: unknown
  /** Stack gap between heading and body (ClassMap `stack()`). Defaults to 2. */
  stackGap?: SpacingScale
}

/** Props accepted by {@link PlanUpdatedPage}. */
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

/**
 * Props accepted by {@link PrivacyPage}. The body is optional projected
 * content (the default projection); without it the boilerplate intro renders.
 */
export interface PrivacyPageProps {
  /** i18n key for the page heading. Defaults to `privacy.title`. */
  titleKey?: string
  /** Default for the heading when the key is missing. Defaults to `"Privacy"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when content is projected). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body (default projection) — use when the page has real content. */
  children?: unknown
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}

/**
 * Props accepted by {@link TermsPage}. The body is optional projected content
 * (the default projection); without it the boilerplate intro renders.
 */
export interface TermsPageProps {
  /** i18n key for the page heading. Defaults to `terms.title`. */
  titleKey?: string
  /** Default for the heading when the i18n key is missing. Defaults to `"Terms"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when content is projected). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body (default projection) — use when the page has real content. */
  children?: unknown
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}
