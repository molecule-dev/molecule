# @molecule/api-encryption

encryption core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-encryption
```

## API

### Interfaces

#### `EncryptionConfig`

```typescript
interface EncryptionConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `EncryptionProvider`

```typescript
interface EncryptionProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): EncryptionProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): EncryptionProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: EncryptionProvider): void
```
