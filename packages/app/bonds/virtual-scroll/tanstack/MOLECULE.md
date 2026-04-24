# @molecule/app-virtual-scroll-tanstack

TanStack Virtual provider for the molecule virtual scroll interface.

Implements `VirtualScrollProvider` from `@molecule/app-virtual-scroll` using
`@tanstack/virtual-core` for headless virtual/infinite scrolling.

## Quick Start

```typescript
import { provider } from '@molecule/app-virtual-scroll-tanstack'
import { setProvider } from '@molecule/app-virtual-scroll'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-virtual-scroll-tanstack
```

## API

### Interfaces

#### `TanStackVirtualConfig`

Configuration options for the TanStack Virtual scroll provider.

```typescript
interface TanStackVirtualConfig {
  /**
   * Whether to enable debug mode in TanStack Virtual.
   * When `true`, TanStack logs internal state changes to the console.
   * Defaults to `false`.
   */
  debug?: boolean

  /**
   * Delay in milliseconds before the `isScrolling` state resets to `false`
   * after scrolling stops. Defaults to `150`.
   */
  isScrollingResetDelay?: number

  /**
   * Whether to use the native `scrollend` event instead of debouncing.
   * Defaults to `false`.
   */
  useScrollendEvent?: boolean
}
```

### Functions

#### `createTanStackProvider(config)`

Creates a TanStack Virtual-backed virtual scroll provider.

```typescript
function createTanStackProvider(config?: TanStackVirtualConfig): VirtualScrollProvider
```

- `config` — Optional TanStack-specific configuration.

**Returns:** A `VirtualScrollProvider` backed by TanStack Virtual.

### Constants

#### `provider`

Default TanStack Virtual provider instance.

```typescript
const provider: VirtualScrollProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-virtual-scroll` >=1.0.0
