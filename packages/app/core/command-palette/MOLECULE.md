# @molecule/app-command-palette

command-palette core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-command-palette
```

## API

### Interfaces

#### `CommandPaletteConfig`

```typescript
interface CommandPaletteConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `CommandPaletteProvider`

```typescript
interface CommandPaletteProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): CommandPaletteProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): CommandPaletteProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: CommandPaletteProvider): void
```
