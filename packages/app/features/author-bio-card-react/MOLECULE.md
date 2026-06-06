# @molecule/app-author-bio-card-react

Author bio card — avatar + name + bio + social links + follow button.

Renders an author identity preview suitable for blog/podcast/video-streaming
article footers, sidebar "About the author" panels, and any other place a
lightweight user-profile card is needed. Two layouts (`compact`, `full`)
cover the common shapes.

## Quick Start

```tsx
import { AuthorBioCard } from '@molecule/app-author-bio-card-react'

<AuthorBioCard
  author={{
    id: 'alice',
    name: 'Alice Example',
    avatar: '/avatars/alice.png',
    bio: 'Writes about distributed systems and tea.',
    href: '/authors/alice',
    socials: { twitter: 'alice', github: 'alice', website: 'alice.example' },
  }}
  layout="full"
  following={isFollowing}
  onFollow={setFollowing}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-author-bio-card-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All UI text routes through `useTranslation()` from `@molecule/app-react`
so apps can override copy via the companion locale bond
`@molecule/app-locales-author-bio-card`.

## Translations

Translation strings are provided by `@molecule/app-locales-author-bio-card`.
