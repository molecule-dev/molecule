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
npm install @molecule/app-file-card-react
```

## API

### Types

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

All styling routes through `getClassMap()` from `@molecule/app-ui` —
swap the ClassMap bond to restyle without touching this package.

All user-visible text routes through `t()` and translates via the
companion `@molecule/app-locales-file-card` locale bond. English
fallbacks are inlined so the card works without the locale bond present.
