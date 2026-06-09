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
npm install @molecule/app-legal-pages-react
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
