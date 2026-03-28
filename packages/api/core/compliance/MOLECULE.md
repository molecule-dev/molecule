# @molecule/api-compliance

compliance core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-compliance
```

## API

### Interfaces

#### `ComplianceConfig`

```typescript
interface ComplianceConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `ComplianceProvider`

```typescript
interface ComplianceProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): ComplianceProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): ComplianceProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: ComplianceProvider): void
```
