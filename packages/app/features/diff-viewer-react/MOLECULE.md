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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
