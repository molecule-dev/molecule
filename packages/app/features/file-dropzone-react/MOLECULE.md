# @molecule/app-file-dropzone-react

File dropzone.

Exports `<FileDropzone>` — drag-drop + click-to-browse with accept/size filtering.

## Quick Start

```tsx
import { FileDropzone } from '@molecule/app-file-dropzone-react'

<FileDropzone
  accept="image/*"
  multiple={false}
  maxSize={5 * 1024 * 1024}
  onFiles={(files) => uploadAvatar(files[0])}
  onRejected={(files) => showError(`${files[0].name} is too large or unsupported`)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-file-dropzone-react
```

## API

### Functions

#### `FileDropzone(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Drag-drop + click-to-browse file upload zone. Pure UI — apps handle
the actual upload.

Rejects files exceeding `maxSize` or not matching `accept` (best-effort
extension/MIME check) via `onRejected`.

```typescript
function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  maxSize,
  onRejected,
  children,
  disabled,
  className,
}: FileDropzoneProps): JSX.Element
```

- `root0` — *
- `root0` — .onFiles
- `root0` — .accept
- `root0` — .multiple
- `root0` — .maxSize
- `root0` — .onRejected
- `root0` — .children
- `root0` — .disabled
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
