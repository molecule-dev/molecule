# @molecule/api-pdf

pdf core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-pdf
```

## API

### Interfaces

#### `PdfConfig`

```typescript
interface PdfConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `PdfProvider`

```typescript
interface PdfProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): PdfProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): PdfProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: PdfProvider): void
```
