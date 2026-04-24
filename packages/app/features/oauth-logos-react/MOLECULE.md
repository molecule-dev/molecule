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

## Type
`feature`

## Installation
```bash
npm install @molecule/app-oauth-logos-react
```

## Usage

```tsx
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'

<button className={app.myButtonChrome}>
  <OAuthProviderLogo provider="github" size={20} />
  <span>Continue with GitHub</span>
</button>
```

## API

### Interfaces

#### `OAuthLogoProps`

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

## Injection Notes

### Requirements

Peer dependencies:
- `react` ^18.0.0 || ^19.0.0
