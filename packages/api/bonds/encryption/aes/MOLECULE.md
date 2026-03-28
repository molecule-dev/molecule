# @molecule/api-encryption-aes

Aes encryption-aes provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-encryption-aes
```

## API

### Interfaces

#### `AesConfig`

```typescript
interface AesConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `AesEncryptionProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: AesConfig): AesEncryptionProvider
```
