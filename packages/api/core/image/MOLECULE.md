# @molecule/api-image

image core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-image
```

## API

### Interfaces

#### `ImageConfig`

```typescript
interface ImageConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `ImageProvider`

```typescript
interface ImageProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): ImageProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): ImageProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: ImageProvider): void
```
