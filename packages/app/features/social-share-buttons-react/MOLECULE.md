# @molecule/app-social-share-buttons-react

Social share buttons row.

Exports `<SocialShareButtons>` — Twitter/LinkedIn/Facebook/Reddit/email/copy button group.

## Quick Start

```tsx
import { SocialShareButtons } from '@molecule/app-social-share-buttons-react'

<SocialShareButtons
  url="https://example.com/blog/my-post"
  title="Check out this article"
  platforms={['twitter', 'linkedin', 'copy']}
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

### Types

#### `SocialPlatform`

Supported social/sharing platforms for the share-buttons widget.

```typescript
type SocialPlatform = 'twitter' | 'x' | 'linkedin' | 'facebook' | 'reddit' | 'email' | 'copy'
```

### Functions

#### `SocialShareButtons(root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .url
- `root0` — .title
- `root0` — .platforms
- `root0` — .size
- `root0` — .className

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
