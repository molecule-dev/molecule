# @molecule/app-editor-layout-react

React editor layout scaffold.

Exports `<EditorLayout>` — sticky top bar + main canvas + optional side panel.
Used for blog post editors, product editors, bot flow editors, etc.

## Quick Start

```tsx
import { EditorLayout } from '@molecule/app-editor-layout-react'

<EditorLayout
  topBar={<EditorToolbar title="Untitled post" />}
  canvas={<ArticleEditor />}
  sidePanel={<MetadataPanel />}
  sidePanelOpen={true}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-editor-layout-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
