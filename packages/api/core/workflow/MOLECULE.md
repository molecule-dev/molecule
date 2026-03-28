# @molecule/api-workflow

workflow core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-workflow
```

## API

### Interfaces

#### `WorkflowConfig`

```typescript
interface WorkflowConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `WorkflowProvider`

```typescript
interface WorkflowProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): WorkflowProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): WorkflowProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: WorkflowProvider): void
```
