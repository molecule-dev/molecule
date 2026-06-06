# @molecule/app-editor-toolbar-react

React editor-top toolbar.

Exports `<EditorToolbar>` — title + badge + primary/secondary actions.

## Quick Start

```tsx
import { EditorToolbar } from '@molecule/app-editor-toolbar-react'

<EditorToolbar
  title="My Blog Post"
  badge={<span>Draft</span>}
  primaryActions={[
    { id: 'save', label: 'Save', onClick: () => save(), variant: 'outline' },
    { id: 'publish', label: 'Publish', onClick: () => publish(), variant: 'solid', color: 'primary' },
  ]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-editor-toolbar-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
