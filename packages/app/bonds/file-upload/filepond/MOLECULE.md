# @molecule/app-file-upload-filepond

FilePond file upload provider for the molecule file upload interface.

Implements `FileUploadProvider` from `@molecule/app-file-upload` using a
headless upload engine with validation, progress tracking, concurrency
control, and image preview generation following FilePond's patterns.

## Quick Start

```typescript
import { provider } from '@molecule/app-file-upload-filepond'
import { setProvider } from '@molecule/app-file-upload'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-file-upload-filepond @molecule/app-file-upload
```

## API

### Interfaces

#### `FilepondConfig`

Configuration options for the FilePond file upload provider.

```typescript
interface FilepondConfig {
  /**
   * Timeout in milliseconds for individual upload requests.
   * Set to `0` for no timeout. Defaults to `0`.
   */
  timeout?: number
}
```

### Functions

#### `createFilepondProvider(config)`

Creates a FilePond-style file upload provider.

```typescript
function createFilepondProvider(config?: FilepondConfig): FileUploadProvider
```

- `config` — Optional FilePond-specific configuration.

**Returns:** A `FileUploadProvider` backed by FilePond-style processing.

### Constants

#### `provider`

Default FilePond file upload provider instance.

```typescript
const provider: FileUploadProvider
```

## Core Interface
Implements `@molecule/app-file-upload` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-file-upload'
import { provider } from '@molecule/app-file-upload-filepond'

export function setupFileUploadFilepond(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-file-upload` >=1.0.0

### Runtime Dependencies

- `@molecule/app-file-upload`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Picking a valid file via the picker starts the upload and shows
  per-file progress through to a completed state.
- [ ] Dragging and dropping a file onto the drop zone uploads it the same
  way.
- [ ] The completed upload appears wherever this app uses it (file list,
  avatar, attachment) — completion is not just a toast.
- [ ] A file that fails validation (too large, wrong type) is rejected with
  a visible message and is never sent to the server.
- [ ] With multiple files (if enabled), each file's progress and completion
  track independently and all complete.
- [ ] Canceling/removing a queued or in-flight file stops it and clears it
  from the queue.
