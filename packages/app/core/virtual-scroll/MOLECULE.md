# @molecule/app-virtual-scroll

virtual-scroll core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-virtual-scroll
```

## API

### Interfaces

#### `VirtualScrollConfig`

```typescript
interface VirtualScrollConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `VirtualScrollProvider`

```typescript
interface VirtualScrollProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): VirtualScrollProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): VirtualScrollProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: VirtualScrollProvider): void
```
