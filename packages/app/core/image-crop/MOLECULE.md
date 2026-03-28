# @molecule/app-image-crop

image-crop core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-image-crop
```

## API

### Interfaces

#### `ImageCropConfig`

```typescript
interface ImageCropConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `ImageCropProvider`

```typescript
interface ImageCropProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): ImageCropProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): ImageCropProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: ImageCropProvider): void
```
