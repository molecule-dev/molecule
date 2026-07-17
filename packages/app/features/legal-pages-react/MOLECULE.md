# @molecule/app-legal-pages-react

React page scaffolds for Terms, Privacy, and PlanUpdated.

Exports:
- Drop-in pages: `<TermsPage>`, `<PrivacyPage>` (boilerplate bodies with
  configurable i18n keys), `<PlanUpdatedPage>` (post-checkout confirmation).
- Bonded-content pages: `<LegalContentPage kind="privacy" | "terms">` — renders
  the SAME legal HTML as the footer modals (`content.privacyPolicy` /
  `content.termsOfService` from `@molecule/app-locales-legal-default`), inside
  the branded `<ContentPageShell>`.
- In-place modals: `<LegalModalLinks>` + `useLegalModals()` — Privacy/Terms
  triggers that open modals instead of navigating.
- Primitives: `<ContentPageShell>` (hero band + surface card),
  `<LegalPageLayout>`, `<LegalPageSection>`.

## Quick Start

```tsx
import { ContentPageShell, LegalPageLayout, LegalPageSection, TermsPage } from '@molecule/app-legal-pages-react'

// Drop-in Terms page (boilerplate body):
<TermsPage />

// Custom Terms page with structured sections:
<ContentPageShell eyebrow="Legal" title="Terms of Service" subtitle="Last updated June 2025">
  <LegalPageLayout title="Terms of Service">
    <LegalPageSection title="Acceptance">
      <p>By using this service you agree to these terms.</p>
    </LegalPageSection>
  </LegalPageLayout>
</ContentPageShell>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-legal-pages-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react react-router-dom
npm install -D @types/react
```

## API

### Interfaces

#### `ContentPageShellProps`

Props for {@link ContentPageShell}.

```typescript
interface ContentPageShellProps {
  /** `data-mol-id` applied to the hero `<header>` for AI-agent selectors. */
  dataMolId?: string
  /** Small uppercase label above the title (e.g. "Legal", "Billing"). */
  eyebrow?: ReactNode
  /**
   * Page title, rendered in the app's headline font inside the hero band.
   * Omit to skip the hero entirely (e.g. for content that renders its own
   * heading, like a pricing tier grid).
   */
  title?: ReactNode
  /** Optional supporting line under the title (e.g. "Last updated …"). */
  subtitle?: ReactNode
  /** App-specific top navigation, rendered above the hero. */
  header?: ReactNode
  /** App-specific footer, rendered below the content. */
  footer?: ReactNode
  /** Page body. Rendered inside a surface card unless {@link bare} is set. */
  children: ReactNode
  /**
   * When true, the body is rendered without the surface card wrapper — for
   * content that brings its own surfaces (e.g. a pricing tier grid).
   */
  bare?: boolean
  /** Container width passed to ClassMap `container({ size })`. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
}
```

#### `LegalContentPageProps`

Props for {@link LegalContentPage}.

```typescript
interface LegalContentPageProps {
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
  header?: ReactNode
  /** App-specific footer, rendered below the content. */
  footer?: ReactNode
  /** i18n key for the small uppercase eyebrow. Defaults to `nav.legal`. */
  eyebrowKey?: string
  /** Default eyebrow text. Defaults to `Legal`. */
  eyebrowDefault?: string
}
```

#### `LegalModalLinksProps`

Props for {@link LegalModalLinks}.

```typescript
interface LegalModalLinksProps extends UseLegalModalsOptions {
  /** className applied to each trigger `<button>` (match the footer's link style). */
  linkClassName?: string
  /** Which links to render. Defaults to `'both'`. */
  show?: 'both' | 'privacy' | 'terms'
  /** Override the Privacy label (defaults to i18n `footer.privacyPolicy`). */
  privacyLabel?: ReactNode
  /** Override the Terms label (defaults to i18n `footer.termsOfService`). */
  termsLabel?: ReactNode
}
```

#### `LegalModalsApi`

Imperative API returned by {@link useLegalModals}.

```typescript
interface LegalModalsApi {
  /** Open the Privacy Policy modal (loads content first). */
  openPrivacy: () => Promise<void>
  /** Open the Terms of Service modal (loads content first). */
  openTerms: () => Promise<void>
  /** The two `<Modal>` elements — render once anywhere in the tree. */
  modals: JSX.Element
}
```

#### `LegalPageLayoutProps`

```typescript
interface LegalPageLayoutProps {
  /** `data-mol-id` for AI agent selectors. */
  dataMolId?: string
  /** Rendered heading text (usually `t('...')`). */
  title: ReactNode
  /** Body content — paragraphs, `<LegalPageSection>`s, etc. */
  children: ReactNode
  /** ClassMap `container({size})` value. Defaults to `'md'`. */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Stack gap between body children passed to ClassMap `stack()`. Defaults to 4. */
  stackGap?: SpacingScale
  /** Override the main wrapper's className (used by apps with custom chrome). */
  mainClassName?: string
  /** Override the body wrapper's className. */
  bodyClassName?: string
}
```

#### `LegalPageSectionProps`

```typescript
interface LegalPageSectionProps {
  /** Rendered heading text. */
  title: ReactNode
  /** Section body — one or more paragraphs. */
  children: ReactNode
  /** Stack gap between heading and body (ClassMap `stack()`). Defaults to 2. */
  stackGap?: SpacingScale
}
```

#### `PlanUpdatedPageProps`

```typescript
interface PlanUpdatedPageProps {
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
}
```

#### `PrivacyPageProps`

```typescript
interface PrivacyPageProps {
  /** i18n key for the page heading. Defaults to `privacy.title`. */
  titleKey?: string
  /** Default for the heading when the key is missing. Defaults to `"Privacy"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when `children` is passed). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body — use when the page has real content. */
  children?: ReactNode
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}
```

#### `TermsPageProps`

```typescript
interface TermsPageProps {
  /** i18n key for the page heading. Defaults to `terms.title`. */
  titleKey?: string
  /** Default for the heading when the i18n key is missing. Defaults to `"Terms"`. */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when `children` is passed). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Optional override body — use when the page has real content, not boilerplate. */
  children?: ReactNode
  /** Stack gap between body children. */
  stackGap?: SpacingScale
}
```

#### `UseLegalModalsOptions`

Shared options for the legal-modal hook + component.

```typescript
interface UseLegalModalsOptions {
  /** App name interpolated into the privacy AND terms bodies (`{{appName}}`). */
  appName?: string
  /**
   * Lazy-loader for the legal HTML — pass `loadContent` from the app's
   * `src/config.ts`. Called right before a modal opens so the bonded
   * content is present on first render.
   */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
}
```

### Types

#### `LegalKind`

Which legal document a {@link LegalContentPage} renders.

```typescript
type LegalKind = 'privacy' | 'terms'
```

### Functions

#### `ContentPageShell(props)`

Branded shell for public content pages (Privacy, Terms, Pricing,
PlanUpdated, …).

Renders the app's own `header`/`footer` slots around a themed hero band
(eyebrow + title + subtitle) and a surface-card content area. Everything
is driven by theme tokens (`--mol-color-*`) and the app's font utility
classes (`font-display` for the title, `font-body`/`font-label` for the
rest), so each app's palette and typography are applied automatically
without per-app overrides.

```typescript
function ContentPageShell({
  dataMolId,
  eyebrow,
  title,
  subtitle,
  header,
  footer,
  children,
  bare = false,
  containerSize = 'md',
}: ContentPageShellProps): JSX.Element
```

- `props` — See {@link ContentPageShellProps}.

**Returns:** The rendered content-page shell.

#### `LegalContentPage(props)`

Standalone Privacy / Terms page that renders the **same** bonded legal
HTML the footer modal shows (`content.privacyPolicy` /
`content.termsOfService` from `@molecule/app-locales-legal-default`),
wrapped in the branded {@link ContentPageShell}.

This keeps the in-place footer modal and the standalone `/privacy`,
`/terms` routes perfectly in sync — one source of legal copy, two
surfaces. Drop one of these into each app's `pages/Privacy.tsx` /
`pages/Terms.tsx`, passing the app's own header/footer chrome.

```typescript
function LegalContentPage({
  kind,
  appName,
  loadContent,
  header,
  footer,
  eyebrowKey = 'nav.legal',
  eyebrowDefault = 'Legal',
}: LegalContentPageProps): JSX.Element
```

- `props` — See {@link LegalContentPageProps}.

**Returns:** The rendered legal content page.

#### `LegalModalLinks(props)`

Drop-in Privacy/Terms links that open IN-PLACE modals instead of
navigating — for bespoke footers and signup pages. Replace
`<Link to="/privacy">Privacy</Link>` / `<Link to="/terms">Terms</Link>`
with `<LegalModalLinks linkClassName={...} appName={APP_NAME} loadContent={loadContent} />`.

Renders the trigger button(s) + the modals together, so it suits the
common case where the two legal links are adjacent. For separated
triggers, use {@link useLegalModals} directly.

```typescript
function LegalModalLinks({
  linkClassName,
  show = 'both',
  privacyLabel,
  termsLabel,
  ...opts
}: LegalModalLinksProps): JSX.Element
```

- `props` — See {@link LegalModalLinksProps}.

**Returns:** The trigger button(s) and their modals.

#### `LegalPageLayout(props)`

Canonical Terms / Privacy layout shell.

`<main data-mol-id={...} class="container py-12">
   <h1>{title}</h1>
   <div class="prose stack">{children}</div>
 </main>`

Use this as the content shell for legal pages. Custom chrome (landing
top-nav, admin sidebar, etc.) should wrap the shell at the call site.

```typescript
function LegalPageLayout({
  dataMolId,
  title,
  children,
  containerSize = 'md',
  stackGap = 4,
  mainClassName,
  bodyClassName,
}: LegalPageLayoutProps): JSX.Element
```

- `props` — Component props (see {@link LegalPageLayoutProps}).

#### `LegalPageSection(props)`

One sub-section of a legal page (`h2` + body) styled for use inside
`<LegalPageLayout>`.

```typescript
function LegalPageSection({
  title,
  children,
  stackGap = 2,
}: LegalPageSectionProps): JSX.Element
```

- `props` — Component props (see {@link LegalPageSectionProps}).

#### `PlanUpdatedPage(props)`

"Plan updated" confirmation screen.

Waits for auth state to initialize, then shows a two-line confirmation
with a single return-home action. i18n keys are configurable so apps
can match their existing locale shape.

```typescript
function PlanUpdatedPage({
  messageKey = 'planUpdated.message',
  messageDefault = 'Your plan has been updated.',
  thankYouKey = 'planUpdated.thankYou',
  thankYouDefault = 'Thank you!',
  actionKey = 'planUpdated.returnHome',
  actionDefault = 'Return to Home',
  actionHref = '/',
}?: PlanUpdatedPageProps): JSX.Element
```

- `props` — Component props (see {@link PlanUpdatedPageProps}).

#### `PrivacyPage(props)`

Default Privacy-policy page scaffold.

With no props, renders the canonical boilerplate Privacy page.
Pass `children` to render real content.

```typescript
function PrivacyPage({
  titleKey = 'privacy.title',
  titleDefault = 'Privacy',
  introKey = 'privacy.intro',
  introDefault = 'This is the Privacy page. Replace this placeholder with real content.',
  children,
  stackGap,
}: PrivacyPageProps): JSX.Element
```

- `props` — Component props (see {@link PrivacyPageProps}).

#### `TermsPage(props)`

Default Terms-of-service page scaffold.

With no props, renders the canonical boilerplate Terms
(`<main><h1>{t('terms.title')}</h1><p>{t('terms.intro')}</p></main>`).
Pass `children` to render real content (e.g. `<LegalPageSection>`s).

```typescript
function TermsPage({
  titleKey = 'terms.title',
  titleDefault = 'Terms',
  introKey = 'terms.intro',
  introDefault = 'This is the Terms page. Replace this placeholder with real content.',
  children,
  stackGap,
}: TermsPageProps): JSX.Element
```

- `props` — Component props (see {@link TermsPageProps}).

#### `useLegalModals(options)`

Headless hook powering in-place Privacy/Terms modals. Use it when the
triggers live in different parts of a bespoke footer (or a signup
page); place `{modals}` once and wire `openPrivacy`/`openTerms` to your
own links/buttons.

The modal body is the SAME bonded HTML the {@link LegalContentPage}
standalone routes render (`content.privacyPolicy` /
`content.termsOfService`), so every legal surface stays in sync.

```typescript
function useLegalModals({
  appName,
  loadContent,
}?: UseLegalModalsOptions): LegalModalsApi
```

- `options` — See {@link UseLegalModalsOptions}.

**Returns:** Imperative {@link LegalModalsApi}.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
- `react-router-dom`

- `LegalContentPage` / `useLegalModals` render bonded HTML that defaults to an
  EMPTY string until the locale module is registered — pass your app's
  `loadContent` (from `src/config.ts`, re-exporting
  `@molecule/app-locales-legal-default`) or the page/modal body will be blank.
- `PlanUpdatedPage` requires BOTH a react-router `<Router>` ancestor (it renders
  a `<Link>`) and wired auth state from `@molecule/app-react` — without an auth
  provider it shows a spinner forever (`state.initialized` never flips). The
  rest of the package is router-free.
- **Name collision:** `PlanUpdatedPage` is also exported by
  `@molecule/app-pricing-page-react` (the pricing-page-flavored success page), and a
  standalone `<PlanUpdated>` lives in `@molecule/app-plan-updated-page-react`. THIS
  package's `<PlanUpdatedPage>` is the legal-pages-kit confirmation page — import it
  from `@molecule/app-legal-pages-react` when you use this kit's other pages.
- `ContentPageShell`'s hero reads `var(--mol-color-primary)` and
  `var(--mol-color-background)` with no fallback, and uses Tailwind theme
  utilities (`font-display`, `bg-background`, `border-outline-variant`) — the
  app theme must define the `--mol-color-` override tokens and font utilities
  or the hero band renders unstyled.
- `TermsPage`/`PrivacyPage` default keys (`terms.title`, `terms.intro`,
  `privacy.title`, `privacy.intro`) and the `nav.legal` eyebrow ship in no
  locale bond — the English `defaultValue`s render unless your app defines
  those keys (all keys are overridable via props).
