# @molecule/app-image-gallery-editor-react

`@molecule/app-image-gallery-editor-react` — hero drop zone + side grid of
thumbnail slots. Click an empty slot or the drop zone to upload; click a
filled slot to remove (native `window.confirm`).

Stateless about persistence — the consumer owns the slot array and handles
uploads via `onPickFiles` (defaults to local object URLs for preview).

## Quick Start

```tsx
import { useState } from 'react'
import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-react'

function GalleryEditor() {
  const [slots, setSlots] = useState<(string | null)[]>(Array(4).fill(null))
  return (
    <ImageGalleryEditor
      slots={slots}
      onChange={setSlots}
      onPickFiles={async (files) => {
        // upload each file, return persisted URLs (null keeps a slot empty)
        return Array.from(files).map((f) => URL.createObjectURL(f))
      }}
      header={<h3>Image Gallery</h3>}
      counter={`${slots.filter(Boolean).length} / 24 Photos`}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-image-gallery-editor-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ImageGalleryEditorProps`

```typescript
interface ImageGalleryEditorProps {
  /** Ordered slots, `null` for empty. Length determines slot count. */
  slots: (string | null)[]
  onChange: (slots: (string | null)[]) => void
  /** Called when the user picks files; defaults to a local object URL. */
  onPickFiles?: (files: FileList) => Promise<(string | null)[]> | (string | null)[]
  maxImages?: number
  /** Header heading + subtitle slot (renders left of the photo counter). */
  header?: ReactNode
  /** Photo-counter label (e.g. "3 / 24 Photos"). */
  counter?: ReactNode
  dropZoneTitle?: ReactNode
  dropZoneHint?: ReactNode
  confirmRemoveMessage?: string
  statusMessage?: ReactNode
  emptySlotIcon?: string
}
```

### Functions

#### `ImageGalleryEditor({
  slots,
  onChange,
  onPickFiles,
  maxImages = 24,
  header,
  counter,
  dropZoneTitle = 'Drag and drop assets here',
  dropZoneHint = 'or click to browse local files',
  confirmRemoveMessage = 'Remove this image?',
  statusMessage,
  emptySlotIcon = 'image',
})`

Editable image gallery primitive.

```typescript
function ImageGalleryEditor({
  slots,
  onChange,
  onPickFiles,
  maxImages = 24,
  header,
  counter,
  dropZoneTitle = 'Drag and drop assets here',
  dropZoneHint = 'or click to browse local files',
  confirmRemoveMessage = 'Remove this image?',
  statusMessage,
  emptySlotIcon = 'image',
}: ImageGalleryEditorProps): JSX.Element
```

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

- HARD PREREQUISITES: this component styles itself with raw Tailwind
  utilities and Material-3 color tokens (`bg-surface-container-low`,
  `border-outline-variant`, `text-on-surface`, `font-headline`, …). The
  host app's Tailwind build must (a) source-scan this package's dist (add
  `@source "../node_modules/@molecule/app-image-gallery-editor-react/dist";`
  to the CSS entry — scaffolds do NOT include it by default) and (b) define
  the Material-3 color tokens in its theme (the polished flagship templates
  do; a plain scaffold does not). Without both, the layout collapses and
  the raw file input renders visible.
- Icons are Material Symbols ligatures (`cloud_upload`, `delete`) — the
  Material Symbols Outlined font must be loaded (scaffolded `index.html`
  links it; other hosts must add the stylesheet) or the icon names render
  as literal text.
- `dropZoneTitle` / `dropZoneHint` / `confirmRemoveMessage` default to
  English strings — pass translated values (`t('...')`) in localized apps.
- `getClassMap()` requires a bonded ClassMap for the layout primitives.
