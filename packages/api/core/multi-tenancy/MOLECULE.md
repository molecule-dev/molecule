# @molecule/api-multi-tenancy

multi-tenancy core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-multi-tenancy
```

## API

### Interfaces

#### `MultiTenancyConfig`

```typescript
interface MultiTenancyConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `MultiTenancyProvider`

```typescript
interface MultiTenancyProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): MultiTenancyProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): MultiTenancyProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: MultiTenancyProvider): void
```
