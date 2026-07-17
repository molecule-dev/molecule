# @molecule/app-file-dropzone-react

File dropzone — drag-drop + click-to-browse file picker with
accept / max-size filtering. Pure UI: it emits the chosen `File[]`
and the host app performs the actual upload.

Exports `<FileDropzone>` and its `FileDropzoneProps`.

## Quick Start

```tsx
import { FileDropzone } from '@molecule/app-file-dropzone-react'

function AvatarUpload() {
  return (
    <FileDropzone
      accept="image/*"
      multiple={false}
      maxSize={5 * 1024 * 1024}
      onFiles={(files) => uploadAvatar(files[0])}
      onRejected={(files) => showError(files[0].name)}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-file-dropzone-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `FileDropzoneProps`

```typescript
interface FileDropzoneProps {
  /** Called with the File[] the user selected or dropped. */
  onFiles: (files: File[]) => void
  /** Accept attribute (e.g. `'image/*'` or `'.pdf,.docx'`). */
  accept?: string
  /** Allow multi-file selection. Defaults to false. */
  multiple?: boolean
  /** Max file size in bytes. Files exceeding are rejected. */
  maxSize?: number
  /** Called with rejected files (wrong type or size). */
  onRejected?: (files: File[]) => void
  /** Optional content rendered inside the dropzone (defaults to standard upload copy). */
  children?: ReactNode
  /** Disabled state. */
  disabled?: boolean
  /** Extra classes on the dropzone wrapper. */
  className?: string
}
```

### Functions

#### `FileDropzone(props)`

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

- `props` — Component props (see {@link FileDropzoneProps}).

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

With `multiple={false}` (the default) only the FIRST accepted file is
delivered to `onFiles`, even when the user drops several at once.

The `accept` filter is a best-effort client-side check (file
extension or MIME prefix match) — treat it as UX sugar and always
re-validate on the server. Files failing `accept` or `maxSize` go to
`onRejected` (both rejection causes arrive in the same callback).

Pass `children` to replace the default "Drop files here or click to
browse" copy; the default copy translates via
`@molecule/app-locales-file-dropzone`.

The zone is a keyboard-activatable `role="button"` (`tabIndex={0}`):
pressing Enter or Space opens the native file dialog, matching a click.

## Translations

Translation strings are provided by `@molecule/app-locales-file-dropzone`.
