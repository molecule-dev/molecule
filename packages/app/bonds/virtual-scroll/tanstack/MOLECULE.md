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
npm install @molecule/app-virtual-scroll-tanstack @molecule/app-virtual-scroll @tanstack/virtual-core
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

## Core Interface
Implements `@molecule/app-virtual-scroll` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-virtual-scroll'
import { provider } from '@molecule/app-virtual-scroll-tanstack'

export function setupVirtualScrollTanstack(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-virtual-scroll` >=1.0.0

### Runtime Dependencies

- `@molecule/app-virtual-scroll`
- `@tanstack/virtual-core`

Provide `onChange` in the INITIAL options — `setOptions()` cannot attach
one after creation (the callback is wired only at `createVirtualizer` time).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A large list (hundreds+ of items) renders immediately, and only a window
  of rows exists in the DOM (row-element count stays far below the total).
- [ ] Scrolling far down (middle and end of the list) shows the CORRECT items
  for that position — no blank gaps, no duplicated or overlapping rows.
- [ ] The scrollbar reflects the full list size (jumping to the end reaches the
  last item, not a truncated tail).
- [ ] With variable-height content, fast scrolling then stopping settles with
  no overlap and no jitter.
- [ ] If wired to infinite loading, reaching the bottom loads and appends the
  next batch seamlessly (no scroll-position jump back to top).
