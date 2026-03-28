# @molecule/api-multi-tenancy-schema

Schema multi-tenancy-schema provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-multi-tenancy-schema
```

## API

### Interfaces

#### `SchemaConfig`

```typescript
interface SchemaConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `SchemaMultiProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: SchemaConfig): SchemaMultiProvider
```
