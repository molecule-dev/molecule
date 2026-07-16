# @molecule/app-editor-layout-react

React editor layout scaffold.

Exports `<EditorLayout>` — sticky top bar + main canvas + optional side
panel. Used for blog post editors, product editors, bot flow editors, etc.

## Quick Start

```tsx
import { EditorLayout } from '@molecule/app-editor-layout-react'
import { EditorToolbar } from '@molecule/app-editor-toolbar-react'

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
npm install @molecule/app-editor-layout-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `EditorLayoutProps`

```typescript
interface EditorLayoutProps {
  /** Sticky top bar — typically title + save/publish buttons + status indicator. */
  topBar: ReactNode
  /** Main editing canvas (wysiwyg, drawable area, form, code editor). */
  canvas: ReactNode
  /** Optional right-side settings / metadata panel. */
  sidePanel?: ReactNode
  /** Side-panel position — defaults to `'right'`. */
  sidePanelPosition?: 'left' | 'right'
  /** Whether the side panel is currently visible. */
  sidePanelOpen?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `EditorLayout(props)`

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

- `props` — Component props (see {@link EditorLayoutProps}).

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

- The scaffold claims the FULL viewport height (h-screen flex column).
  Render it as the page root; nesting it below another fixed-height app
  shell produces double scrollbars.
- The side panel container sets flex-shrink 0 but NO width — your
  `sidePanel` content must define its own width.
- `topBar` is wrapped in a sticky container by the layout itself (unlike
  `<DetailPageLayout>`); the slot does not need its own stickiness, but
  should bring a surface background.
- `ArticleEditor` and `MetadataPanel` above are your own components.
- Styling resolves through `getClassMap()` — requires a wired ClassMap
  bond (standard molecule app setup). No text of its own.
