# @molecule/app-file-upload-filepond

FilePond file upload provider for the molecule file upload interface.

Implements `FileUploadProvider` from `@molecule/app-file-upload` using a
headless upload engine with validation, progress tracking, concurrency
control, and image preview generation following FilePond's patterns.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-file-upload-filepond
```

## Usage

```typescript
import { provider } from '@molecule/app-file-upload-filepond'
import { setProvider } from '@molecule/app-file-upload'

setProvider(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-file-upload` >=1.0.0
