# @molecule/api-sitemap

sitemap core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-sitemap
```

## API

### Interfaces

#### `SitemapConfig`

```typescript
interface SitemapConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `SitemapProvider`

```typescript
interface SitemapProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): SitemapProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): SitemapProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: SitemapProvider): void
```
