# @molecule/app-oauth-buttons-react

Config-driven `<OAuthButtons providers={[...]} />` row.

Lifts the bespoke `OAuthButtons.tsx` re-implemented by every flagship
Login / Signup page today into a single composable component, building
on `@molecule/app-oauth-logos-react` for the canonical brand marks.

- `providers` accepts the canonical `OAuthProviderId[]` from
  `useOAuth(config).providers` (or any other source) — apps no
  longer need to map provider strings into bespoke button arrays.
- `onSelect(provider)` initiates the OAuth flow. Host apps typically
  pass `redirect` from `useOAuth(config)` or `signInWithProvider`
  from their auth bond.
- `layout` toggles `'horizontal' | 'vertical' | 'grid'` — the grid
  variant auto-paginates into a 2-column layout above 4 providers.
- `brandButtons` opt-in paints each button with its provider's exact
  brand-spec background (`#fff` for Google, `#24292f` for GitHub,
  etc.) via inline `style` — those are provider-mandated color tokens
  ClassMap intentionally does not encode. It is independent of
  `iconMode` (logo color). Layout, padding, radius, and chrome all
  come from the wired ClassMap (`cm.oauthButtonGroup`,
  `cm.oauthButton`, `cm.oauthButtonIcon`).
- `<OAuthDivider>` is the composable "or continue with" rule — the
  config-driven `<OAuthButtons>` in `@molecule/app-auth-ui-react`
  composes it above this row.

Companion locale bond:
`@molecule/app-locales-oauth-buttons-react` (79 languages).

## Quick Start

```tsx
import { OAuthButtons } from '@molecule/app-oauth-buttons-react'
import { useOAuth } from '@molecule/app-react'
import { oauthConfig } from '../config'

function LoginPage() {
  const { providers, redirect } = useOAuth(oauthConfig)
  return (
    <OAuthButtons
      providers={providers}
      onSelect={redirect}
      layout="grid"
      showLabels
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-oauth-buttons-react
```

## API

### Interfaces

#### `BrandStyle`

Inline-style payload for a single brand button.

```typescript
interface BrandStyle {
  /** Background color (CSS color token). */
  background: string
  /** Foreground / label color (CSS color token). */
  color: string
  /** Optional 1px border color when `background` is white/very light. */
  borderColor?: string
}
```

#### `OAuthButtonsProps`

Props accepted by `<OAuthButtons />`.

```typescript
interface OAuthButtonsProps {
  /**
   * Ordered list of provider ids to render.
   *
   * Typically the `string[]` from `useOAuth(config).providers`. Known
   * canonical ids (e.g. `'google'`, `'github'` — see `OAuthProviderId`)
   * get their brand logo + localized label; unknown ids fall through to
   * a synthesized label and a ClassMap-neutral button, so any string is
   * safe to pass.
   */
  providers: string[]
  /**
   * Optional click handler. Called with the provider id when the user
   * activates a button.
   *
   * If omitted, buttons render as plain `<button type="button">` with no
   * default behavior — host apps wire the handler (typically calling
   * `redirect(provider)` from `useOAuth(...)` or the auth bond's
   * `signInWithProvider(provider)`).
   */
  onSelect?: (provider: string) => void
  /**
   * Optional success callback. Reserved for host apps that resolve the
   * OAuth handshake inline (popup / pkce-on-page) rather than via a full
   * page redirect. Called with the provider id once the handshake
   * completes successfully.
   */
  onSuccess?: (provider: string) => void
  /**
   * Layout variant. Defaults to `'horizontal'` (flex-wrap row).
   *
   * - `'horizontal'`: row that wraps when crowded.
   * - `'vertical'`: stacked column (one button per line).
   * - `'grid'`: 2-column grid (recommended for >4 providers).
   */
  layout?: OAuthButtonsLayout
  /** Icon size in pixels. Defaults to 30. */
  iconSize?: number
  /** Logo color mode — `'brand'` (default, official multi-color) or `'mono'`. */
  iconMode?: 'brand' | 'mono'
  /**
   * When true, paint each button with its provider's brand-spec
   * background/foreground colors (Google white, GitHub `#24292f`, etc.)
   * via inline `style`. Defaults to `false` — buttons stay
   * ClassMap-neutral so the row is visually uniform.
   *
   * Independent of `iconMode`: `iconMode` controls the *logo's* color
   * rendering, `brandButtons` controls the *button surface*.
   */
  brandButtons?: boolean
  /**
   * When true, render the localized provider label text next to the
   * logo (e.g. `"Continue with GitHub"`). Defaults to `false` (icon-only
   * pixel-identical row across providers).
   */
  showLabels?: boolean
  /** Extra class composed onto the button-group element. */
  className?: string
}
```

#### `OAuthDividerProps`

Props accepted by `<OAuthDivider />` — the "or continue with" rule
rendered above an OAuth button row.

```typescript
interface OAuthDividerProps {
  /**
   * i18n key for the divider label. Defaults to `'oauth.orContinueWith'`.
   */
  labelKey?: string
  /**
   * Fallback divider text if the i18n key is missing. Defaults to
   * `'or continue with'`.
   */
  labelDefault?: string
  /** Extra class composed onto the divider wrapper. */
  className?: string
}
```

### Types

#### `OAuthButtonsLayout`

Layout variants for the OAuth button row.

```typescript
type OAuthButtonsLayout = 'horizontal' | 'vertical' | 'grid'
```

#### `OAuthProviderId`

Canonical list of supported providers.

```typescript
type OAuthProviderId = 'github' | 'gitlab' | 'google' | 'twitter' | 'x' | 'apple' | 'facebook' | 'microsoft' | 'linkedin' | 'discord';
```

### Functions

#### `dedupeProviders(providers)`

De-duplicates a provider list while preserving the caller's order.

Mirrors how host apps typically pass `providers` derived from
`useOAuth(config).providers` plus per-page overrides — duplicates can
sneak in via merge-and-pass patterns.

```typescript
function dedupeProviders(providers: readonly T[]): T[]
```

- `providers` — Raw list (may contain duplicates).

**Returns:** Ordered list with duplicates removed.

#### `getBrandStyle(provider)`

Returns the inline `style` payload for a given provider id.

Unknown providers receive an empty object so the wired ClassMap's
default surface color governs — matching the icon-only fallback
behavior of `<OAuthProviderLogo fallback={...} />`.

```typescript
function getBrandStyle(provider: string): CSSProperties
```

- `provider` — Canonical provider id (e.g. `'google'`).

**Returns:** Inline-style object for the button element.

#### `getButtonLayoutStyle(layout)`

Returns the inline-style overlay for an individual button in a given
layout. In `'vertical'` mode each button stretches to fill the column.

```typescript
function getButtonLayoutStyle(layout: OAuthButtonsLayout): CSSProperties
```

- `layout` — Selected layout variant.

**Returns:** Inline-style object to spread onto the button element.

#### `getLayoutStyle(layout, providerCount)`

Returns the inline-style overlay applied on top of `cm.oauthButtonGroup`
for a given layout variant.

```typescript
function getLayoutStyle(layout: OAuthButtonsLayout, providerCount: number): CSSProperties
```

- `layout` — Selected layout variant.
- `providerCount` — Number of buttons rendered (drives grid columns).

**Returns:** Inline-style object to spread onto the wrapper element.

#### `getProviderLabel(provider)`

Returns the i18n entry (key + English default) for a given provider id.

Falls back to a synthesized entry for unknown ids so unrecognized
providers still render with a sensible English label rather than a
raw key string.

```typescript
function getProviderLabel(provider: string): { key: string; default: string; }
```

- `provider` — Canonical provider id (e.g. `'google'`).

**Returns:** Translation key + English default for the provider.

### Constants

#### `BRAND_STYLES`

Brand-spec colors for each supported OAuth provider.

Sourced from each provider's official developer brand guidelines.
When a host app wants to override these (dark-mode tweaks, brand
exceptions), pass `iconMode="mono"` and let the wired ClassMap
paint everything via `cm.oauthButton`.

```typescript
const BRAND_STYLES: Readonly<Record<OAuthProviderId, BrandStyle>>
```

#### `PROVIDER_LABELS`

Canonical i18n key + English default for each supported provider.

Used by `<OAuthButtons />` to render the localized provider name
(e.g. `"Continue with {{provider}}"`). The `key` matches the
companion locale bond `@molecule/app-locales-oauth-buttons-react`.

```typescript
const PROVIDER_LABELS: Readonly<Record<OAuthProviderId, { key: string; default: string; }>>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-oauth-logos-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-oauth-buttons-react`.
