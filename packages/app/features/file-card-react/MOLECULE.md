# @molecule/app-file-card-react

React file card primitives.

Exports:
- `<FileCard>` — file representation card (icon/thumbnail + name + size + modified date + optional actions).
  Two layouts: `'grid'` (square tile, default) and `'row'` (horizontal list line).
- `<FileIcon>` — stroke-currentColor SVG glyph keyed by `FileKind`.
- `bytes(value)` — pure helper that formats a byte count as `420 B` / `1.4 KB` / `2.3 MB` / etc.
- `relativeBucket(at, now?)` — pure helper that buckets a timestamp into `just-now` / `minutes` /
  `hours` / `days` / `weeks` / `months` / `absolute`.
- `FileSummary` / `FileKind` types — stable shape for the consumer's domain model.

Used by cloud-file-manager (grid + list views), social-media + email-client
(attachment previews), and document-collaboration (sidebars).

## Quick Start

```tsx
import { FileCard, type FileSummary } from '@molecule/app-file-card-react'

const file: FileSummary = {
  id: 'f-1',
  name: 'Q3-report.pdf',
  size: 482_137,
  kind: 'document',
  modifiedAt: '2026-04-30T18:23:00Z',
}

<FileCard
  file={file}
  layout="grid"
  onClick={(f) => openFile(f.id)}
  actions={<KebabMenu fileId={file.id} />}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-file-card-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `FileCardProps`

Props for `<FileCard>`.

```typescript
interface FileCardProps {
  /** The file to render. */
  file: FileSummary
  /** Selected highlight state. */
  selected?: boolean
  /** Click handler fired on card body click (not on the actions slot). */
  onClick?: (file: FileSummary, event: MouseEvent<HTMLElement>) => void
  /** Context-menu (right-click) handler. */
  onContextMenu?: (file: FileSummary, event: MouseEvent<HTMLElement>) => void
  /** Layout — `'grid'` (default) is a square tile, `'row'` is a horizontal list line. */
  layout?: 'grid' | 'row'
  /** Optional trailing action slot (button row, kebab menu). Clicks here do not fire `onClick`. */
  actions?: ReactNode
  /** Reference "now" for relative-time formatting. Useful for testing/snapshots. */
  now?: Date
  /** Extra classes merged onto the root element. */
  className?: string
  /** Override the root `data-mol-id` (defaults to `file-card-${file.id}`). */
  dataMolId?: string
}
```

#### `FileIconProps`

Props for `<FileIcon>`.

```typescript
interface FileIconProps {
  /** File kind — picks the SVG glyph. */
  kind: FileKind
  /** Pixel size of the rendered SVG (default 24). */
  size?: number
  /** Optional aria-label. When omitted the icon is `aria-hidden`. */
  ariaLabel?: string
}
```

#### `FileSummary`

Minimal description of a file shown in a `<FileCard>`. Apps map their own
domain types onto this shape — there is no required mime field; pass
`kind` instead so the icon matches even when only a filename is known.

```typescript
interface FileSummary {
  /** Stable identifier for the file (parent React key + `data-mol-id` suffix). */
  id: string
  /** Display name (filename including extension). */
  name: string
  /** Size in bytes. Pass `0` for folders or unknown. */
  size: number
  /** File kind — drives the icon and the "kind" aria token. */
  kind: FileKind
  /** Last-modified timestamp (ISO string, ms epoch, or `Date`). Optional. */
  modifiedAt?: string | number | Date
  /** Optional thumbnail URL. When set, replaces the icon in `'grid'` layout. */
  thumbnail?: string
}
```

### Types

#### `FileKind`

Supported file kinds. Drives icon selection and the "<kind>" portion of
the aria label translation key (e.g. `file-card.kind.image`).

```typescript
type FileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'code'
  | 'folder'
  | 'other'
```

#### `RelativeBucket`

A relative-time bucket used to pick a translation key. Higher granularity
buckets first; falls through to absolute date when older than ~1 year.

```typescript
type RelativeBucket =
  | { kind: 'just-now' }
  | { kind: 'minutes'; n: number }
  | { kind: 'hours'; n: number }
  | { kind: 'days'; n: number }
  | { kind: 'weeks'; n: number }
  | { kind: 'months'; n: number }
  | { kind: 'absolute'; iso: string }
```

### Functions

#### `bytes(value)`

Format a non-negative byte count as a short human-readable string
(e.g. `420 B`, `1.4 KB`, `2.3 MB`, `4.7 GB`, `8.1 TB`).

Uses a 1024 base (binary) and 1 fractional digit for KB+. Returns the
literal string for non-finite or negative inputs so callers do not need to
pre-validate. The unit token is intentionally not localized — sizes are
universal SI shorthand and translating them would imply different
magnitudes.

```typescript
function bytes(value: number): string
```

- `value` — Byte count (>= 0).

**Returns:** Formatted size string.

#### `FileCard(props, props, props, props, props, props, props, props, props, props)`

File representation card — icon (or thumbnail), filename, formatted size,
relative modified date, and optional trailing actions slot. Used by
cloud-file-manager grids/lists, social-media + email-client attachment
previews, and document-collaboration sidebars.

Two layouts:
- `'grid'` (default) — square tile with the icon/thumbnail stacked above
  the metadata. Suitable for finder-style grids and attachment galleries.
- `'row'` — horizontal line item with the icon on the left, metadata in
  the middle, and the actions slot on the right. Suitable for list views
  and chat/email attachment rows.

All styling routes through `getClassMap()`. All user-visible text routes
through `t()` so the card translates via the companion
`@molecule/app-locales-file-card` locale bond.

```typescript
function FileCard({
  file,
  selected,
  onClick,
  onContextMenu,
  layout = 'grid',
  actions,
  now,
  className,
  dataMolId,
}: FileCardProps): JSX.Element
```

- `props` — Component props.
- `props` — .file - File summary to render.
- `props` — .selected - Selected highlight state.
- `props` — .onClick - Body click handler.
- `props` — .onContextMenu - Right-click handler.
- `props` — .layout - `'grid'` (default) or `'row'`.
- `props` — .actions - Trailing action slot (button row, kebab menu).
- `props` — .now - Reference "now" for relative-time formatting.
- `props` — .className - Extra root classes.
- `props` — .dataMolId - Override the root `data-mol-id`.

**Returns:** The file card element.

#### `FileIcon(props, props, props, props)`

Icon glyph for a file kind. Stroke-currentColor SVG so it inherits the
surrounding text color (no ClassMap colors needed).

```typescript
function FileIcon({ kind, size = 24, ariaLabel }: FileIconProps): JSX.Element
```

- `props` — Component props.
- `props` — .kind - File kind.
- `props` — .size - Pixel size (default 24).
- `props` — .ariaLabel - Optional aria-label; when omitted the icon is decorative.

**Returns:** The SVG icon element.

#### `relativeBucket(at, now)`

Bucket a `Date` (or ISO string / ms timestamp) against `now` into a
relative-time bucket. The bucket is purely structural — translation keys
and pluralization are applied by the consumer.

```typescript
function relativeBucket(at: string | number | Date, now?: Date): RelativeBucket
```

- `at` — Modified-at timestamp (ISO string, ms epoch, or `Date`).
- `now` — Reference "now" (defaults to `new Date()`). Injected for tests.

**Returns:** A `RelativeBucket` describing the offset from `now`.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

All styling routes through `getClassMap()` from `@molecule/app-ui` —
swap the ClassMap bond to restyle without touching this package.

All user-visible text routes through `t()` and translates via the
companion `@molecule/app-locales-file-card` locale bond. English
fallbacks are inlined so the card works without the locale bond present.

## Translations

Translation strings are provided by `@molecule/app-locales-file-card`.
