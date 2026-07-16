# @molecule/app-social-share-buttons-react

Social share buttons row.

Exports `<SocialShareButtons>` — Twitter(X)/LinkedIn/Facebook/Reddit/
email/copy button group, plus the `SocialPlatform` union. Each network
button opens that platform's share URL in a new tab; `'copy'` writes
the URL to the clipboard with "Copied!" feedback. `'x'` is an alias
of `'twitter'` (same intent URL). Default platforms:
twitter, linkedin, facebook, copy.

## Quick Start

```tsx
import { SocialShareButtons } from '@molecule/app-social-share-buttons-react'

<SocialShareButtons
  url="https://example.com/blog/my-post"
  title="Check out this article"
  platforms={['twitter', 'linkedin', 'reddit', 'email', 'copy']}
  size="sm"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-social-share-buttons-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SocialShareButtonsProps`

Props for the {@link SocialShareButtons} component.

```typescript
interface SocialShareButtonsProps {
  /** URL to share. */
  url: string
  /** Optional share text / title. */
  title?: string
  /** Platforms to include (order = display order). */
  platforms?: SocialPlatform[]
  /** Visual size. */
  size?: 'sm' | 'md'
  /** Extra classes. */
  className?: string
}
```

### Types

#### `SocialPlatform`

Supported social/sharing platforms for the share-buttons widget.

```typescript
type SocialPlatform = 'twitter' | 'x' | 'linkedin' | 'facebook' | 'reddit' | 'email' | 'copy'
```

### Functions

#### `SocialShareButtons(props)`

Row of share buttons — opens each platform's share sheet in a new
tab. `'copy'` copies the URL to the clipboard with "Copied!"
feedback. Keep the component itself cosmetic-only; apps override
icons via `className` on the wrapping element.

```typescript
function SocialShareButtons({
  url,
  title,
  platforms = DEFAULT_PLATFORMS,
  size = 'sm',
  className,
}: SocialShareButtonsProps): React.JSX.Element
```

- `props` — Component props (see {@link SocialShareButtonsProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

- Must render inside the app's i18n provider and with a ClassMap bond
  wired (`useTranslation()` / `getClassMap()` throw otherwise).
- `'copy'` uses `navigator.clipboard`, which exists only in secure
  contexts (HTTPS or localhost). On plain HTTP the button silently
  does nothing — hide it or serve over HTTPS.
- Sharing uses fixed platform intent URLs opened in a new tab; there
  is no Web Share API integration and no per-platform SDKs.
- Button icons are plain text glyphs (𝕏, "in", "f", ✉, ⧉), not brand
  SVG logos — restyle via `className` if brand marks are required.
- Only `share.copied` ships in the companion locale bond today; the
  per-platform `share.<platform>` aria-label keys fall back to the raw
  platform id in every language.

## Translations

Translation strings are provided by `@molecule/app-locales-social-share-buttons`.
