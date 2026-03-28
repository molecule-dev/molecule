# @molecule/api-audit

audit core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-audit
```

## API

### Interfaces

#### `AuditConfig`

```typescript
interface AuditConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `AuditProvider`

```typescript
interface AuditProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): AuditProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): AuditProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: AuditProvider): void
```
