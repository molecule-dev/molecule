# @molecule/app-image-crop-cropperjs

Cropper.js provider for \@molecule/app-image-crop.

Provides an in-memory image crop implementation conforming to
the molecule image crop provider interface.

## Quick Start

```typescript
import { provider } from '@molecule/app-image-crop-cropperjs'
import { setProvider } from '@molecule/app-image-crop'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-image-crop-cropperjs
```

## API

### Interfaces

#### `CropperjsConfig`

Provider-specific configuration options.

```typescript
interface CropperjsConfig {
  /** Whether to show guides by default. Defaults to `true`. */
  guides?: boolean

  /** Whether to show the crop box background. Defaults to `true`. */
  background?: boolean
}
```

### Functions

#### `createProvider(_config)`

Creates a Cropper.js-based image crop provider.

```typescript
function createProvider(_config?: CropperjsConfig): ImageCropProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured ImageCropProvider.

### Constants

#### `provider`

Default Cropper.js provider instance.

```typescript
const provider: ImageCropProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-image-crop` ^1.0.0
