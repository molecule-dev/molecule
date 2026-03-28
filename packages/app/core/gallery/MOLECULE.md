# @molecule/app-gallery

gallery core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-gallery
```

## API

### Interfaces

#### `GalleryConfig`

```typescript
interface GalleryConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `GalleryProvider`

```typescript
interface GalleryProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): GalleryProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): GalleryProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: GalleryProvider): void
```
