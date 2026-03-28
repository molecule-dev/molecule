# @molecule/app-data-table

data-table core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-data-table
```

## API

### Interfaces

#### `DataTableConfig`

```typescript
interface DataTableConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `DataTableProvider`

```typescript
interface DataTableProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): DataTableProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): DataTableProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: DataTableProvider): void
```
