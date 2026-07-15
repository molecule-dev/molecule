# @molecule/app-legal-pages-react

React page scaffolds for Terms, Privacy, and PlanUpdated.

Exports both high-level "drop-in" page components (`TermsPage`,
`PrivacyPage`, `PlanUpdatedPage`) and composable primitives
(`LegalPageLayout`, `LegalPageSection`) for apps that need custom
chrome or structured multi-section content.

All text routes through `useTranslation()` so apps stay i18n-driven
while reusing the canonical layout and typography.

## Quick Start

```tsx
import { ContentPageShell, LegalPageLayout, LegalPageSection, TermsPage } from '@molecule/app-legal-pages-react'

// Drop-in Terms page (boilerplate body):
<TermsPage />

// Custom Terms page with structured sections:
<ContentPageShell eyebrow="Legal" title="Terms of Service" subtitle="Last updated June 2025" header={<AppNav />}>
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

#### `UseLegalModalsOptions`

Shared options for the legal-modal hook + component.

```typescript
interface UseLegalModalsOptions {
  /** App name interpolated into the privacy body (`{{appName}}`). */
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
classes (`font-headline` for the title, `font-body`/`font-label` for the
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

#### `LegalPageLayout(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .dataMolId
- `root0` — .title
- `root0` — .children
- `root0` — .containerSize
- `root0` — .stackGap
- `root0` — .mainClassName
- `root0` — .bodyClassName

#### `LegalPageSection(root0, root0, root0, root0)`

One sub-section of a legal page (`h2` + body) styled for use inside
`<LegalPageLayout>`.

```typescript
function LegalPageSection({
  title,
  children,
  stackGap = 2,
}: LegalPageSectionProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .children
- `root0` — .stackGap

#### `PlanUpdatedPage(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .messageKey
- `root0` — .messageDefault
- `root0` — .thankYouKey
- `root0` — .thankYouDefault
- `root0` — .actionKey
- `root0` — .actionDefault
- `root0` — .actionHref

#### `PrivacyPage(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .titleKey
- `root0` — .titleDefault
- `root0` — .introKey
- `root0` — .introDefault
- `root0` — .children
- `root0` — .stackGap

#### `TermsPage(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .titleKey
- `root0` — .titleDefault
- `root0` — .introKey
- `root0` — .introDefault
- `root0` — .children
- `root0` — .stackGap

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
