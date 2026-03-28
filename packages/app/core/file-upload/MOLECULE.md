# @molecule/app-file-upload

file-upload core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-file-upload
```

## API

### Interfaces

#### `FileUploadConfig`

```typescript
interface FileUploadConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `FileUploadProvider`

```typescript
interface FileUploadProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): FileUploadProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): FileUploadProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: FileUploadProvider): void
```
