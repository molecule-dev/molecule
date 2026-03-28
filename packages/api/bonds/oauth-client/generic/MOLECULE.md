# @molecule/api-oauth-client-generic

Generic oauth-client-generic provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-client-generic
```

## API

### Interfaces

#### `GenericConfig`

```typescript
interface GenericConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `GenericOauthProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: GenericConfig): GenericOauthProvider
```
