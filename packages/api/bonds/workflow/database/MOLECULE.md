# @molecule/api-workflow-database

Database workflow-database provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-workflow-database
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

#### `DatabaseWorkflowProvider`

### Functions

#### `createProvider(config)`

```typescript
function createProvider(config: DatabaseConfig): DatabaseWorkflowProvider
```
