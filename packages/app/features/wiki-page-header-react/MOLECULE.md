# @molecule/app-wiki-page-header-react

Wiki / docs page header.

Exports `<WikiPageHeader>` — breadcrumb + title + meta row (version,
updated time/by, tags) + Edit/History action buttons.

## Quick Start

```tsx
import { WikiPageHeader } from '@molecule/app-wiki-page-header-react'

<WikiPageHeader
  title="Getting Started"
  breadcrumb={<span>Docs / Guides</span>}
  version="v3"
  updatedAt="2 days ago"
  updatedBy="Alice"
  tags={<><span>guide</span><span>setup</span></>}
  onEdit={() => console.log('edit')}
  onHistory={() => console.log('history')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-wiki-page-header-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `WikiPageHeaderProps`

Props for the {@link WikiPageHeader} component.

```typescript
interface WikiPageHeaderProps {
  /** Page title. */
  title: ReactNode
  /** Optional breadcrumb trail above the title. */
  breadcrumb?: ReactNode
  /** Version label ("v23", "rev. 2025-04-12"). */
  version?: ReactNode
  /** Last-updated display (relative or absolute). */
  updatedAt?: ReactNode
  /** Updated-by author display. */
  updatedBy?: ReactNode
  /** Tag chips. */
  tags?: ReactNode
  /** Called when the user clicks Edit. */
  onEdit?: () => void
  /** Called when the user clicks History. */
  onHistory?: () => void
  /** Optional extra right-side actions. */
  extraActions?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `WikiPageHeader(props)`

Wiki / docs / knowledge-base page header — breadcrumb +
title + meta row (version, updated time/by, tags) + Edit/History
action buttons.

```typescript
function WikiPageHeader({
  title,
  breadcrumb,
  version,
  updatedAt,
  updatedBy,
  tags,
  onEdit,
  onHistory,
  extraActions,
  className,
}: WikiPageHeaderProps): JSX.Element
```

- `props` — Component props (see {@link WikiPageHeaderProps}).

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

The Edit / History buttons render only when `onEdit` / `onHistory` are
provided. Their labels and the 'Updated' meta prefix go through
`t('wiki.edit')` / `t('wiki.history')` / `t('wiki.updatedAt')` with
English fallbacks — translations live in
`@molecule/app-locales-wiki-page-header`, which exists on disk but is not
yet registered in mlcl's registry; register it or add the keys to app
translations. Everything else (breadcrumb, version, updatedAt/By, tags,
extraActions) is a pre-formatted ReactNode slot. Props (documented on
the exported `WikiPageHeaderProps` interface): title, breadcrumb,
version, updatedAt, updatedBy, tags, onEdit, onHistory, extraActions,
className.

## Translations

Translation strings are provided by `@molecule/app-locales-wiki-page-header`.
