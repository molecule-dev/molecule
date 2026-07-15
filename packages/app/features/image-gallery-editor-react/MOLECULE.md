# @molecule/app-image-gallery-editor-react

`@molecule/app-image-gallery-editor-react` — hero drop zone + side
grid of thumbnail slots. Click an empty slot or the drop zone to
upload; click a filled slot to remove.

Stateless about persistence — the consumer owns the slot array and
handles uploads via `onPickFiles` (defaults to local object URLs for
preview).

## Quick Start

```tsx
import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-react'

const [slots, setSlots] = useState<(string | null)[]>(Array(4).fill(null))

<ImageGalleryEditor
  slots={slots}
  onChange={setSlots}
  onPickFiles={async (files) => {
    const urls = await Promise.all(Array.from(files).map(uploadToS3))
    return urls
  }}
  header={<h3>Image Gallery</h3>}
  counter={`${slots.filter(Boolean).length} / 24 Photos`}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-image-gallery-editor-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

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
