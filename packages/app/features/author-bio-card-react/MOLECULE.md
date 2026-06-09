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

## API

### Interfaces

#### `AuthorBioCardAuthor`

Author identity rendered by `<AuthorBioCard>`.

```typescript
interface AuthorBioCardAuthor {
  /** Stable identifier (used as a link key, `data-mol-id` suffix, etc.). */
  id: string
  /** Display name — rendered as a clickable link if `href` is provided. */
  name: string
  /** Optional avatar image URL. Falls back to initials if omitted. */
  avatar?: string
  /** Optional bio paragraph. */
  bio?: string
  /** Optional profile URL — when set, the name renders as a link. */
  href?: string
  /** Optional dictionary of social handles / profile links. */
  socials?: AuthorSocials
}
```

#### `AuthorSocials`

Social handles / profile links for an author. All keys are optional —
pass only the platforms the author actually has. Each value may be a
full URL or a bare handle (`"@alice"`); the card forwards values to
`<a href>` verbatim, so callers control the linking strategy.

```typescript
interface AuthorSocials {
  /** Twitter / X profile URL or handle. */
  twitter?: string
  /** GitHub profile URL or handle. */
  github?: string
  /** LinkedIn profile URL. */
  linkedin?: string
  /** Mastodon profile URL or `@user@instance` handle. */
  mastodon?: string
  /** Personal website URL. */
  website?: string
}
```

### Functions

#### `AuthorBioCard(props, props, props, props, props, props, props)`

Author bio card — avatar + name + bio + social links + optional follow
button. Designed for blog/podcast/video-streaming article footers and
other user-profile previews. Two layouts:

- `compact` (default): single horizontal row, suitable for inline
  author bylines or sidebar "About the author" panels.
- `full`: stacked layout with a larger avatar and a dedicated social row
  beneath the bio paragraph.

All user-facing strings (Follow / Following labels, social aria-labels)
route through `useTranslation()` so apps can override text via the
companion locale bond `@molecule/app-locales-author-bio-card`.

```typescript
function AuthorBioCard({
  author,
  layout = 'compact',
  following = false,
  onFollow,
  className,
  dataMolId = 'author-bio-card',
}: AuthorBioCardProps): JSX.Element
```

- `props` — Component props.
- `props` — .author - Author identity + bio + socials.
- `props` — .layout - Layout preset: `compact` (default) or `full`.
- `props` — .following - Whether the viewer currently follows this author.
- `props` — .onFollow - Toggle handler for the follow button.
- `props` — .className - Extra classes on the outer card.
- `props` — .dataMolId - `data-mol-id` for AI-agent selectors.

**Returns:** The rendered author bio card.

#### `resolveSocialHref(key, value)`

Resolve a social value (URL or bare handle) into an `href`. URLs pass
through unchanged; bare handles are routed to a sensible per-platform
default. Mastodon handles of the form `@user@instance` become
`https://instance/@user`.

```typescript
function resolveSocialHref(key: "twitter" | "github" | "linkedin" | "mastodon" | "website", value: string): string
```

- `key` — Which platform the value is for.
- `value` — The raw social value (URL or handle).

**Returns:** A fully-qualified URL safe to use as `<a href>`.

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
