# @molecule/app-diff-viewer-react

Text/code diff viewer.

Exports `<DiffViewer>` (unified or split mode).

## Quick Start

```tsx
import { DiffViewer } from '@molecule/app-diff-viewer-react'

<DiffViewer
  before="const x = 1\nconsole.log(x)"
  after="const x = 2\nconsole.log(x)"
  filename="src/config.ts"
  mode="unified"
  showLineNumbers={true}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-diff-viewer-react
```

## API

### Functions

#### `DiffViewer(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .before
- `root0` — .after
- `root0` — .mode
- `root0` — .showLineNumbers
- `root0` — .filename
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
