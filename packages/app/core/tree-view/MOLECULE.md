# @molecule/app-tree-view

tree-view core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-tree-view
```

## API

### Interfaces

#### `TreeViewConfig`

```typescript
interface TreeViewConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `TreeViewProvider`

```typescript
interface TreeViewProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): TreeViewProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): TreeViewProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: TreeViewProvider): void
```
