# @molecule/api-content-moderation

content-moderation core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-content-moderation
```

## API

### Interfaces

#### `ContentModerationConfig`

```typescript
interface ContentModerationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `ContentModerationProvider`

```typescript
interface ContentModerationProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): ContentModerationProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): ContentModerationProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: ContentModerationProvider): void
```
