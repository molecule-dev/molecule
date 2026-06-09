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

## API

### Functions

#### `EditorLayout(root0, root0, root0, root0, root0, root0, root0, root0)`

Three-region editor scaffold: sticky top bar + main canvas + optional
collapsible side panel.

Used by blog post editors, product-listing editors, chatbot flow
editors, design canvases, etc.

```typescript
function EditorLayout({
  topBar,
  canvas,
  sidePanel,
  sidePanelPosition = 'right',
  sidePanelOpen = true,
  className,
  dataMolId,
}: EditorLayoutProps): JSX.Element
```

- `root0` — *
- `root0` — .topBar
- `root0` — .canvas
- `root0` — .sidePanel
- `root0` — .sidePanelPosition
- `root0` — .sidePanelOpen
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
