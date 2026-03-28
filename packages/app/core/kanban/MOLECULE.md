# @molecule/app-kanban

kanban core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-kanban
```

## API

### Interfaces

#### `KanbanConfig`

```typescript
interface KanbanConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `KanbanProvider`

```typescript
interface KanbanProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): KanbanProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): KanbanProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: KanbanProvider): void
```
