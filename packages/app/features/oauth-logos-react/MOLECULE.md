# @molecule/app-oauth-logos-react

Canonical OAuth provider brand logos.

Ships every logo as a self-contained React SVG component with a
normalized 24×24 viewBox and a `mode` prop (`'brand'` default — the
official multi-color mark — or `'mono'` — `currentColor` for
uniform-theme button rows).

Unlike resolving icons through `@molecule/app-icons`, these logos
are bundled inline so every app renders pixel-identical marks
regardless of which icon-set bond is wired.

Exports:
- `<OAuthProviderLogo provider="github"|"google"|... />` — dispatcher.
- Individual logos: `<GitHubLogo/>`, `<GoogleLogo/>`, `<GitLabLogo/>`,
  `<TwitterLogo/>` / `<XLogo/>`, `<AppleLogo/>`, `<FacebookLogo/>`,
  `<MicrosoftLogo/>`, `<LinkedInLogo/>`, `<DiscordLogo/>`.
- `OAuthProviderId`, `OAuthLogoProps` types.

## Quick Start

```tsx
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'

<button className={app.myButtonChrome}>
  <OAuthProviderLogo provider="github" size={20} />
  <span>Continue with GitHub</span>
</button>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-oauth-logos-react
```

## API

### Interfaces

#### `OAuthLogoProps`

Props shared by all OAuth provider logo components.

```typescript
interface OAuthLogoProps {
  /**
   * Rendered size in pixels (applied to both width and height). Defaults to 20.
   *
   * Every logo is authored at a normalized 24×24 viewBox so scaling is
   * identical across providers at any size — the logo's visual weight
   * matches exactly between apps.
   */
  size?: number
  /** Optional className on the outer SVG element. */
  className?: string
  /**
   * Color mode. Defaults to `'brand'` (official multi-color marks).
   * Use `'mono'` to render in `currentColor` — useful for uniform
   * monochrome rows that match the button text color.
   */
  mode?: 'brand' | 'mono'
  /**
   * Accessible label. Defaults to the provider's brand name
   * (e.g., `"GitHub"`, `"Google"`). Pass `''` to mark the logo
   * `aria-hidden` (typical when the button itself has an aria-label).
   */
  ariaLabel?: string
  /** Optional title rendered as `<title>` for hover tooltips. */
  title?: string
}
```

### Types

#### `OAuthProviderId`

Canonical list of supported providers.

```typescript
type OAuthProviderId =
  | 'github'
  | 'gitlab'
  | 'google'
  | 'twitter'
  | 'x'
  | 'apple'
  | 'facebook'
  | 'microsoft'
  | 'linkedin'
  | 'discord'
```

### Functions

#### `AppleLogo(root0, root0, root0, root0, root0)`

Apple logo. Monochrome only — `mode` ignored.

```typescript
function AppleLogo({
  size = 20,
  className,
  ariaLabel = 'Apple',
  title,
}: OAuthLogoProps): React.JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .ariaLabel
- `root0` — .title

#### `DiscordLogo(root0, root0, root0, root0, root0, root0)`

Discord brand mark. `mode='brand'` renders the official blurple
logo; `mode='mono'` renders in `currentColor`.

```typescript
function DiscordLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Discord',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .mode
- `root0` — .ariaLabel
- `root0` — .title

#### `FacebookLogo(root0, root0, root0, root0, root0, root0)`

Facebook "f" mark. `mode='brand'` renders the blue circle with white
"f"; `mode='mono'` renders a monochrome "f" in `currentColor`.

```typescript
function FacebookLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Facebook',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .mode
- `root0` — .ariaLabel
- `root0` — .title

#### `GitHubLogo(root0, root0, root0, root0, root0)`

GitHub Octocat brand mark.

Brand guideline: monochrome only — no brand color, so `mode` is ignored
(always uses `currentColor`). Typical placement: against a dark or
neutral background.

```typescript
function GitHubLogo({
  size = 20,
  className,
  ariaLabel = 'GitHub',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .ariaLabel
- `root0` — .title

#### `GitLabLogo(root0, root0, root0, root0, root0, root0)`

GitLab tanuki — official brand mark, normalized to a 24×24 viewBox.
`mode='mono'` renders a flat tanuki silhouette in `currentColor`.

```typescript
function GitLabLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'GitLab',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .mode
- `root0` — .ariaLabel
- `root0` — .title

#### `GoogleLogo(root0, root0, root0, root0, root0, root0)`

Google "G" mark — per Google brand guidelines the 4-color logo is
required when space allows. In `mode='mono'` the logo flattens to
`currentColor` for use inside monochrome button rows.

```typescript
function GoogleLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Google',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .mode
- `root0` — .ariaLabel
- `root0` — .title

#### `LinkedInLogo(root0, root0, root0, root0, root0, root0)`

LinkedIn brand mark. `mode='brand'` renders the blue square with
white "in"; `mode='mono'` renders a monochrome "in" glyph.

```typescript
function LinkedInLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'LinkedIn',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .mode
- `root0` — .ariaLabel
- `root0` — .title

#### `MicrosoftLogo(root0, root0, root0, root0, root0, root0)`

Microsoft 4-square brand mark. `mode='brand'` renders the four
official squares; `mode='mono'` renders a flat 2×2 grid in
`currentColor`.

```typescript
function MicrosoftLogo({
  size = 20,
  className,
  mode = 'brand',
  ariaLabel = 'Microsoft',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .mode
- `root0` — .ariaLabel
- `root0` — .title

#### `OAuthProviderLogo(root0, root0, root0)`

Dispatcher: renders the canonical logo for a given provider id.

Use this in OAuth button rows so the button chrome (padding, radius,
width, background) stays per-app while the logo itself is identical
across every consumer.

```typescript
function OAuthProviderLogo({
  provider,
  fallback = null,
  ...rest
}: OAuthProviderLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .provider
- `root0` — .fallback

#### `TwitterLogo(root0, root0, root0, root0, root0)`

X (formerly Twitter) brand mark. Monochrome only per X brand
guidelines; `mode` is ignored — always uses `currentColor`.

Use either `<TwitterLogo/>` or `<XLogo/>` — they render the same SVG.

```typescript
function TwitterLogo({
  size = 20,
  className,
  ariaLabel = 'X (Twitter)',
  title,
}: OAuthLogoProps): JSX.Element
```

- `root0` — *
- `root0` — .size
- `root0` — .className
- `root0` — .ariaLabel
- `root0` — .title

### Constants

#### `XLogo`

Alias of `TwitterLogo` — use the provider id that matches your OAuth config.

```typescript
const XLogo: typeof TwitterLogo
```

## Injection Notes

### Requirements

Peer dependencies:
- `react` ^18.0.0 || ^19.0.0
