# @molecule/app-keyboard-shortcuts-hotkeys

hotkeys-js provider for @molecule/app-keyboard-shortcuts.

Provides an in-memory keyboard shortcut registry conforming to
the molecule keyboard shortcuts provider interface.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-keyboard-shortcuts-hotkeys
```

## Usage

```typescript
import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { setProvider } from '@molecule/app-keyboard-shortcuts'

setProvider(provider)
```

## API

### Interfaces

#### `HotkeysConfig`

Provider-specific configuration options.

```typescript
interface HotkeysConfig {
  /** Default scope for shortcuts. Defaults to `'all'`. */
  defaultScope?: string

  /** Whether shortcuts are enabled initially. Defaults to `true`. */
  enabled?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a hotkeys-based keyboard shortcuts provider.

```typescript
function createProvider(config?: HotkeysConfig): KeyboardShortcutsProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured KeyboardShortcutsProvider.

### Constants

#### `provider`

Default hotkeys provider instance.

```typescript
const provider: KeyboardShortcutsProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-keyboard-shortcuts` ^1.0.0
