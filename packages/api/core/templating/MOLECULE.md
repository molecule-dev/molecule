# @molecule/api-templating

templating core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-templating
```

## API

### Interfaces

#### `TemplatingConfig`

```typescript
interface TemplatingConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `TemplatingProvider`

```typescript
interface TemplatingProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): TemplatingProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): TemplatingProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: TemplatingProvider): void
```
