# @molecule/app-diff-viewer-react

Text/code diff viewer.

Exports `<DiffViewer>` (unified or split mode). Pure JS line diff (LCS,
no external library) with add/remove row highlighting, optional line
numbers, and an optional filename header.

## Quick Start

```tsx
import { DiffViewer } from '@molecule/app-diff-viewer-react'

<DiffViewer
  before={'const x = 1\nconsole.log(x)'}
  after={'const x = 2\nconsole.log(x)'}
  filename="src/config.ts"
  mode="unified"
  showLineNumbers={true}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-diff-viewer-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `DiffViewerProps`

```typescript
interface DiffViewerProps {
  /** Original text. */
  before: string
  /** New text. */
  after: string
  /** Display mode. Defaults to `'unified'`. */
  mode?: 'unified' | 'split'
  /** Show line numbers. Defaults to true. */
  showLineNumbers?: boolean
  /** Optional filename / context label. */
  filename?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `DiffViewer(props)`

Text diff viewer — unified or split layout with line-by-line
add/remove highlighting. Pure JS (no library) so apps don't pull
in megabytes for simple diffs.

For large diffs (10k+ lines), wrap with virtualization upstream.

```typescript
function DiffViewer({
  before,
  after,
  mode = 'unified',
  showLineNumbers = true,
  filename,
  className,
}: DiffViewerProps): JSX.Element
```

- `props` — Component props (see {@link DiffViewerProps}).

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

- Pass `before`/`after` as JS string expressions (curly braces) as above.
  A quoted JSX attribute (`before="a\nb"`) does NOT interpret `\n` — you
  would diff one line containing a literal backslash-n.
- The diff is an O(n*m) dynamic program — fine for typical UI diffs;
  for very large inputs (10k+ lines) chunk or virtualize upstream.
- Highlight colors are fixed translucent green/red (rgba) rather than
  theme tokens; they read on light and dark surfaces but are not
  themeable via ClassMap.
- No user-facing text of its own (only +/- glyphs), so no locale bond is
  needed. Styling resolves through `getClassMap()` — requires a wired
  ClassMap bond (standard molecule app setup).
