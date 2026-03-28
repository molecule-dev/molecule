# @molecule/app-drag-drop

drag-drop core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-drag-drop
```

## API

### Interfaces

#### `DragDropConfig`

```typescript
interface DragDropConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `DragDropProvider`

```typescript
interface DragDropProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): DragDropProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): DragDropProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: DragDropProvider): void
```
