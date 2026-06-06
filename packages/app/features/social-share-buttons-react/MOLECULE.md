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
npm install @molecule/app-social-share-buttons-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
