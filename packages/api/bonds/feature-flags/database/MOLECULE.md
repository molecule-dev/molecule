# @molecule/api-feature-flags-database

Database feature-flags-database provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-feature-flags-database
```

## API

### Interfaces

#### `DatabaseConfig`

```typescript
interface DatabaseConfig {
  // TODO: Define provider-specific config
  [key: string]: unknown
}
```

### Classes

#### `DatabaseFeatureProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: DatabaseConfig): DatabaseFeatureProvider
```
