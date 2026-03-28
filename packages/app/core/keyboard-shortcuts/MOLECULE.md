# @molecule/app-keyboard-shortcuts

keyboard-shortcuts core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-keyboard-shortcuts
```

## API

### Interfaces

#### `KeyboardShortcutsConfig`

```typescript
interface KeyboardShortcutsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
```

#### `KeyboardShortcutsProvider`

```typescript
interface KeyboardShortcutsProvider {
  readonly name: string
  // TODO: Define provider methods
}
```

### Functions

#### `getProvider()`

```typescript
function getProvider(): KeyboardShortcutsProvider | null
```

#### `hasProvider()`

```typescript
function hasProvider(): boolean
```

#### `requireProvider()`

```typescript
function requireProvider(): KeyboardShortcutsProvider
```

#### `setProvider(provider)`

```typescript
function setProvider(provider: KeyboardShortcutsProvider): void
```
