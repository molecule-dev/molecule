# @molecule/app-markdown

markdown core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-markdown
```

## API

### Interfaces

#### `MarkdownConfig`

```typescript
interface MarkdownConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `MarkdownProvider`

```typescript
interface MarkdownProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): MarkdownProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): MarkdownProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: MarkdownProvider): void
```
