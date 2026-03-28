# @molecule/api-audit-database

Database audit-database provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-audit-database
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

#### `DatabaseAuditProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: DatabaseConfig): DatabaseAuditProvider
```
